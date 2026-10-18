package eduupm.hsaas.assignment;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.auth.Accounts;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.card.CardRules;
import eduupm.hsaas.common.*;
import eduupm.hsaas.common.IdempotencyPort.SafeResult;
import eduupm.hsaas.config.FoundationProperties;
import eduupm.hsaas.reader.ReaderPort;
import eduupm.hsaas.registration.RegistrationLifecyclePort;
import eduupm.hsaas.registration.RegistrationReviewPort;
import static eduupm.hsaas.assignment.LifecycleStore.*;

/** Real transactional simulation: current authority, inventory, assignments, evidence, local audit and replay commit together. */
public final class LifecycleService {
    private final LifecycleStore store;
    private final LifecycleSecurity security;
    private final RegistrationLifecyclePort roots;
    private final RegistrationReviewPort reviewRoots;
    private final ReaderPort reader;
    private final IdempotencyPort idem;
    private final LocalAuditPort audit;
    private final JsonMapper json;
    private final Clock clock;
    private final FoundationProperties properties;
    private final TransactionTemplate tx;

    LifecycleService(LifecycleStore store,Accounts accounts,SessionCapabilities capabilities,RegistrationLifecyclePort roots,
            RegistrationReviewPort reviewRoots,ReaderPort reader,IdempotencyPort idem,LocalAuditPort audit,JsonMapper json,
            Clock clock,FoundationProperties properties,PlatformTransactionManager manager) {
        this.store=store; this.security=new LifecycleSecurity(accounts,capabilities,store.jdbc); this.roots=roots; this.reviewRoots=reviewRoots;
        this.reader=reader; this.idem=idem; this.audit=audit; this.json=json; this.clock=clock; this.properties=properties;
        tx=new TransactionTemplate(manager); tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }

    /** A uniqueness loser only queries a winner under fresh authority; it never silently reapplies the command. */
    SafeResult command(LifecycleSecurity.Context context,boolean admin,String operation,String target,String key,String body) {
        if(TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("Lifecycle starts outside a domain transaction");
        for(int attempt=0;attempt<2;attempt++) {
            var actor=security.preflight(context,admin);
            var input=LifecycleInput.parse(json,operation,body);
            var plan=discover(operation,target,input,admin);
            var scope=new RequestEncoding.Scope(RequestEncoding.Kind.USER,Long.toString(actor.id()));
            var namespace=new IdempotencyPort.Namespace(scope,operation,plan.target(),IdempotencyPort.key(key));
            byte[] encoding=input.encoding(json,scope,operation,plan.target());
            boolean recovery=attempt>0;
            try {
                return tx.execute(status->{
                    var current=security.lock(context,admin,plan.counter()==null?List.of():List.of(plan.counter()));
                    var replay=idem.replay(namespace,encoding);
                    if(replay.isPresent()) return replay.get().result();
                    if(recovery) throw new ApiFailure(409,"IDEMPOTENCY_CONFLICT","Check the original command before retrying.");
                    var locked=lock(plan,context,current,operation,input);
                    replay=idem.replay(namespace,encoding);
                    if(replay.isPresent()) return replay.get().result();
                    var result=apply(operation,input,plan,locked,context,current.id());
                    idem.success(namespace,encoding,200,result);
                    return result;
                });
            } catch(DuplicateKeyException conflict) {
                if(attempt==1) throw new ApiFailure(409,"IDEMPOTENCY_CONFLICT","Check the original command before retrying.");
            }
        }
        throw new IllegalStateException("Lifecycle command did not produce a result");
    }

    /** Nonlocking discovery supplies only immutable coordinates; lock() rejects any changed active mapping. */
    private Plan discover(String operation,String target,LifecycleInput input,boolean admin) {
        Long counter=null; String registration=null,card=null,assignment=null,job=null,result=null,device=null;
        String namespaceTarget=target;
        if(operation.equals("SCAN_START")) {
            counter=LifecycleInput.decimal(input.text("counterId")); String purpose=input.text("purpose");
            namespaceTarget=input.text("targetId");
            if(admin) {
                if(purpose.equals("ENROLL")) { if(!namespaceTarget.equals("REGISTER")) throw LifecycleInput.invalid(); }
                else if(purpose.equals("RESTORE")) card=LifecycleInput.uuid(namespaceTarget);
                else throw LifecycleInput.invalid();
            } else if(purpose.equals("ISSUE")) registration=Long.toString(LifecycleInput.decimal(namespaceTarget));
            else if(purpose.equals("RETURN")) assignment=LifecycleInput.uuid(namespaceTarget);
            else throw LifecycleInput.invalid();
            device=deviceId(counter);
        } else if(operation.equals("SCAN_SIMULATE") || operation.equals("SCAN_CANCEL")) {
            job=LifecycleInput.uuid(target); var scan=store.job(job,false); counter=scan.counter(); device=scan.device();
            if(!scan.environment().equals(properties.environment())) throw CardRules.unavailable();
        } else if(operation.equals("CARD_ENROLL")) namespaceTarget="REGISTER";
        else if(operation.equals("ISSUE")) { registration=Long.toString(LifecycleInput.decimal(input.text("registrationId"))); namespaceTarget=registration; }
        else if(Set.of("RETURN","CONTACT_REVEAL","FOLLOWUP").contains(operation)) assignment=LifecycleInput.uuid(target);
        else card=LifecycleInput.uuid(target);

        if(assignment!=null) {
            var a=store.assignment(assignment,false); registration=Long.toString(a.registration()); card=a.cardId();
            if(!a.environment().equals(properties.environment())) throw CardRules.unavailable();
            if(counter!=null && counter!=a.returnCounter()) throw CardRules.unavailable();
            counter=a.counter();
            if(a.returnCounter()!=a.counter()) throw CardRules.unavailable();
        }
        if(registration!=null) {
            var coordinates=roots.discover(registration);
            long registrationCounter=LifecycleInput.decimal(coordinates.counterId());
            if(counter!=null && counter!=registrationCounter) throw CardRules.unavailable();
            counter=registrationCounter;
        }
        if(Set.of("ISSUE","RETURN","CARD_ENROLL","RESTORE").contains(operation)) {
            result=LifecycleInput.uuid(input.text("scanResultId")); var evidence=store.evidence(result,false); var scan=store.job(evidence.job(),false);
            if(!scan.environment().equals(properties.environment()) || !evidence.environment().equals(properties.environment())) throw CardRules.unavailable();
            if(counter!=null && counter!=scan.counter()) throw CardRules.unavailable();
            counter=scan.counter(); job=scan.id(); device=scan.device();
            if(operation.equals("ISSUE")) {
                var found=store.byUid(evidence.uid()); if(found==null) throw CardRules.unavailable(); card=found.id();
            }
        }
        if(card!=null && assignment==null && !Set.of("ISSUE","SCAN_START").contains(operation)) {
            if(!store.card(card,false).environment().equals(properties.environment())) throw CardRules.unavailable();
            var active=store.activeForCard(card);
            if(active!=null) { assignment=active.id(); registration=Long.toString(active.registration()); }
        }
        // ADMIN card actions may close an active assignment without acquiring any staff capability.
        if(registration!=null && counter==null && !admin) counter=LifecycleInput.decimal(roots.discover(registration).counterId());
        return new Plan(namespaceTarget,counter,registration,card,assignment,job,result,device);
    }

    /** Relative locks: authority -> category(enroll) -> device -> registration -> card -> assignment -> job -> result. */
    private Locked lock(Plan plan,LifecycleSecurity.Context context,Accounts.Account actor,String operation,LifecycleInput input) {
        Long enrollmentCategory=null;
        if(operation.equals("CARD_ENROLL")) {
            var e=store.evidence(plan.result(),false);
            var categories=store.jdbc.query("SELECT id FROM visitor_categories WHERE code=? AND active=TRUE FOR SHARE",(rs,n)->rs.getLong(1),e.category());
            CardRules.require(!categories.isEmpty(),"CARD_CATEGORY_UNAVAILABLE"); enrollmentCategory=categories.getFirst();
        }
        Device device=null;
        if(plan.device()!=null) {
            if(operation.equals("SCAN_START")) {
                // Deterministic device identity and the counter's unique key prevent duplicate provisioning races.
                store.jdbc.update("INSERT INTO reader_devices(id,counter_id,data_origin,environment) VALUES(?,?,'SIMULATED',?) ON DUPLICATE KEY UPDATE id=id",
                        plan.device(),plan.counter(),properties.environment());
            }
            device=store.device(plan.device(),true);
            CardRules.require(device.active() && device.counter()==plan.counter() && device.environment().equals(properties.environment()),"SCAN_BINDING_INVALID");
        }
        RegistrationLifecyclePort.Access registration=null;
        if(plan.registration()!=null) registration=roots.lockLifecycle(roots.discover(plan.registration()),context.owner());
        if(registration!=null && (!registration.environment().equals(properties.environment()) || !registration.origin().equals("SYNTHETIC"))) throw CardRules.unavailable();
        Card card=plan.card()==null?null:store.card(plan.card(),true);
        Assignment assignment=plan.assignment()==null?null:store.assignment(plan.assignment(),true);
        if(card!=null && (!card.environment().equals(properties.environment()) || !card.origin().equals("SIMULATED"))) throw CardRules.unavailable();
        if(assignment!=null && (!assignment.environment().equals(properties.environment()) || !assignment.origin().equals("SIMULATED"))) throw CardRules.unavailable();
        if(card!=null && !Set.of("ISSUE","SCAN_START","SCAN_SIMULATE","SCAN_CANCEL").contains(operation)) {
            var active=store.activeForCard(card.id());
            // A new active assignment may require an earlier root lock: abort instead of chasing it out of order.
            if(!Objects.equals(active==null?null:active.id(),plan.assignment()) && !Set.of("RETURN","CONTACT_REVEAL","FOLLOWUP").contains(operation)) {
                throw new ApiFailure(409,"VERSION_CONFLICT","The active assignment changed. Refresh before continuing.");
            }
        }
        if(assignment!=null) {
            CardRules.require(assignment.cardId().equals(plan.card()) && Long.toString(assignment.registration()).equals(plan.registration()),"ASSIGNMENT_CHANGED");
            if(actor.role().equals("COUNTER_STAFF") && (assignment.counter()!=plan.counter() || assignment.returnCounter()!=plan.counter())) throw CardRules.unavailable();
        }
        return new Locked(device,registration,card,assignment,enrollmentCategory);
    }

    private SafeResult apply(String operation,LifecycleInput input,Plan plan,Locked locked,LifecycleSecurity.Context context,long actor) {
        Instant now=clock.instant().truncatedTo(ChronoUnit.MICROS);
        return switch(operation) {
            case "SCAN_START" -> start(input,plan,locked,context,actor,now);
            case "SCAN_SIMULATE" -> simulate(input,plan,locked,context,actor,now);
            case "SCAN_CANCEL" -> cancel(plan,locked,context,actor,now);
            case "CARD_ENROLL" -> enroll(input,plan,locked,context,actor,now);
            case "ISSUE" -> issue(input,plan,locked,context,actor,now);
            case "RETURN" -> returned(input,plan,locked,context,actor,now);
            case "MARK_LOST","DISABLE","RESTORE" -> inventoryAction(operation,input,plan,locked,context,actor,now);
            case "FOLLOWUP" -> followup(input,locked,actor,now);
            default -> throw new IllegalArgumentException("Unknown lifecycle operation");
        };
    }

    /** Replacing an unexpired scan is forbidden; expiry/cancel/consumption clears the single-device fence. */
    private SafeResult start(LifecycleInput input,Plan plan,Locked locked,LifecycleSecurity.Context context,long actor,Instant now) {
        var device=locked.device();
        if(device.activeJob()!=null) {
            var old=store.job(device.activeJob(),true);
            if((old.status().equals("CLAIMED") || old.status().equals("SUCCEEDED")) && now.isBefore(old.expires())) {
                throw new ApiFailure(409,"SCAN_DEVICE_BUSY","Cancel or finish the current scan before starting another.");
            }
            if(Set.of("CLAIMED","SUCCEEDED").contains(old.status())) store.jdbc.update("UPDATE scan_jobs SET status='EXPIRED' WHERE id=?",old.id());
        }
        String purpose=input.text("purpose");
        if(purpose.equals("ISSUE")) CardRules.require(locked.registration().status().equals("VERIFIED"),"REGISTRATION_STATE_CONFLICT");
        if(purpose.equals("RETURN")) CardRules.require(locked.assignment().closed()==null && Set.of("ISSUED","OVERDUE").contains(locked.card().status()),"CARD_STATE_CONFLICT");
        if(purpose.equals("RESTORE")) CardRules.require(Set.of("LOST","DISABLED").contains(locked.card().status()),"CARD_STATE_CONFLICT");
        String id=uuid(),keyVersion=properties.hashKeyVersion();
        String nonce=capability("NONCE",id,keyVersion),lease=capability("LEASE",id,keyVersion);
        store.jdbc.update("INSERT INTO scan_jobs(id,device_id,actor_id,owner_context_id,counter_id,purpose,target_ref,nonce_digest,lease_digest,capability_key_version,expires_at,status,created_at,environment) VALUES(?,?,?,?,?,?,?,?,?,?,?,'CLAIMED',?,?)",
                id,device.id(),actor,context.owner(),plan.counter(),purpose,input.text("targetId"),digest(nonce),digest(lease),keyVersion,
                DatabaseTime.sql(now.plusSeconds(120)),DatabaseTime.sql(now),properties.environment());
        store.jdbc.update("UPDATE reader_devices SET active_scan_job_id=? WHERE id=?",id,device.id());
        audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"SCAN",id,actor,new LocalAuditPort.Snapshot(null,"CLAIMED",null,0L,"SIMULATED"));
        return new SafeResult(id,null,"CLAIMED",0);
    }

    /** The browser chooses a known synthetic sample; only the server adapter supplies UID/profile/category. */
    private SafeResult simulate(LifecycleInput input,Plan plan,Locked locked,LifecycleSecurity.Context context,long actor,Instant now) {
        var job=store.job(plan.job(),true); guard(job,locked.device(),context,actor,now);
        CardRules.require(job.status().equals("CLAIMED"),"SCAN_STATE_CONFLICT");
        CardRules.require(MessageDigest.isEqual(digest(input.text("nonce")),job.nonceDigest())
                && MessageDigest.isEqual(digest(input.text("leaseToken")),job.leaseDigest()),"SCAN_BINDING_INVALID");
        var reading=reader.read(input.text("sampleCode")); String result=uuid();
        store.jdbc.update("INSERT INTO scan_results(id,job_id,normalized_uid,profile_code,category_code,sample_code,data_origin,environment,accepted_at) VALUES(?,?,?,?,?,?,'SIMULATED',?,?)",
                result,job.id(),reading.normalizedUid(),reading.profileCode(),reading.categoryCode(),reading.sampleCode(),properties.environment(),DatabaseTime.sql(now));
        store.jdbc.update("UPDATE scan_jobs SET status='SUCCEEDED' WHERE id=? AND status='CLAIMED'",job.id());
        audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"SCAN",job.id(),actor,new LocalAuditPort.Snapshot("CLAIMED","SUCCEEDED",0L,1L,"SIMULATED"));
        return new SafeResult(result,null,"SUCCEEDED",1);
    }
    private SafeResult cancel(Plan plan,Locked locked,LifecycleSecurity.Context context,long actor,Instant now) {
        var job=store.job(plan.job(),true); requireOwner(job,context,actor);
        CardRules.require(Objects.equals(locked.device().activeJob(),job.id()) && Set.of("CLAIMED","SUCCEEDED").contains(job.status()),"SCAN_STATE_CONFLICT");
        String state=now.isBefore(job.expires())?"CANCELLED":"EXPIRED";
        store.jdbc.update("UPDATE scan_jobs SET status=? WHERE id=?",state,job.id());
        store.jdbc.update("UPDATE reader_devices SET active_scan_job_id=NULL WHERE id=? AND active_scan_job_id=?",job.device(),job.id());
        audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"SCAN",job.id(),actor,new LocalAuditPort.Snapshot(job.status(),state,0L,1L,"SIMULATED"));
        return new SafeResult(job.id(),null,state,1);
    }

    /** Validation and consumption occur after all domain locks and within the same transaction as the business change. */
    private Evidence evidence(Plan plan,Locked locked,LifecycleSecurity.Context context,long actor,String purpose,String target,Instant now) {
        var job=store.job(plan.job(),true); guard(job,locked.device(),context,actor,now);
        CardRules.require(job.status().equals("SUCCEEDED") && job.purpose().equals(purpose) && job.target().equals(target),"SCAN_BINDING_INVALID");
        var result=store.evidence(plan.result(),true);
        CardRules.require(result.job().equals(job.id()) && result.origin().equals("SIMULATED")
                && result.environment().equals(job.environment()) && result.environment().equals(properties.environment()),"SCAN_BINDING_INVALID");
        // Re-derive the finite trusted mapping rather than accepting a corrupted/mismatched persisted profile.
        var trusted=reader.read(result.sample());
        CardRules.require(trusted.normalizedUid().equals(result.uid()) && trusted.profileCode().equals(result.profile())
                && trusted.categoryCode().equals(result.category()),"SCAN_PROFILE_UNKNOWN");
        return result;
    }
    private void consume(Plan plan,Instant now) {
        int updated=store.jdbc.update("UPDATE scan_jobs SET status='CONSUMED',consumed_at=? WHERE id=? AND status='SUCCEEDED' AND expires_at>?",
                DatabaseTime.sql(now),plan.job(),DatabaseTime.sql(now));
        CardRules.require(updated==1,"SCAN_STATE_CONFLICT");
        store.jdbc.update("UPDATE reader_devices SET active_scan_job_id=NULL WHERE id=? AND active_scan_job_id=?",plan.device(),plan.job());
    }
    private void requireOwner(Job job,LifecycleSecurity.Context context,long actor) {
        if(job.actor()!=actor || !job.owner().equals(context.owner())) throw CardRules.unavailable();
    }
    private void guard(Job job,Device device,LifecycleSecurity.Context context,long actor,Instant now) {
        requireOwner(job,context,actor);
        CardRules.require(device!=null && device.active() && job.device().equals(device.id()) && job.counter()==device.counter()
                && Objects.equals(device.activeJob(),job.id()) && job.environment().equals(device.environment())
                && job.environment().equals(properties.environment()),"SCAN_BINDING_INVALID");
        CardRules.require(now.isBefore(job.expires()),"SCAN_EXPIRED");
    }
    private SafeResult enroll(LifecycleInput input,Plan plan,Locked locked,LifecycleSecurity.Context context,long actor,Instant now) {
        var result=evidence(plan,locked,context,actor,"ENROLL","REGISTER",now);
        CardRules.require(store.byUid(result.uid())==null,"CARD_ALREADY_ENROLLED");
        String card=uuid(),code=reader.read(result.sample()).cardCode();
        store.jdbc.update("INSERT INTO cards(id,normalized_uid,card_code,category_id,category_code,profile_code,status,enrolled_by,enrolled_at,data_origin,environment) VALUES(?,?,?,?,?,?,'AVAILABLE',?,?,'SIMULATED',?)",
                card,result.uid(),code,locked.enrollmentCategory(),result.category(),result.profile(),actor,DatabaseTime.sql(now),properties.environment());
        consume(plan,now); event("CARD_REGISTERED",card,null,null,actor,null,"AVAILABLE",null,0L,null,now);
        return new SafeResult(card,code,"AVAILABLE",0);
    }

    /** The fixed due instant and rule version are captured from one ordinary settings snapshot, never recalculated later. */
    private SafeResult issue(LifecycleInput input,Plan plan,Locked locked,LifecycleSecurity.Context context,long actor,Instant now) {
        var r=locked.registration(); var card=locked.card(); CardRules.version(r.version(),input.version());
        CardRules.require(r.status().equals("VERIFIED") && r.origin().equals("SYNTHETIC") && r.environment().equals(properties.environment()),"REGISTRATION_STATE_CONFLICT");
        CardRules.require(card.status().equals("AVAILABLE") && card.origin().equals("SIMULATED") && card.environment().equals(r.environment())
                && card.category().equals(r.categoryCode()) && Long.toString(card.categoryId()).equals(r.categoryId()),"CARD_CATEGORY_MISMATCH");
        CardRules.require(input.bool("handoverConfirmed"),"HANDOVER_REQUIRED");
        CardRules.require(store.jdbc.queryForObject("SELECT COUNT(*) FROM card_assignments WHERE active_registration_id=?",Integer.class,
                LifecycleInput.decimal(plan.registration()))==0,"ASSIGNMENT_ALREADY_ACTIVE");
        var result=evidence(plan,locked,context,actor,"ISSUE",plan.registration(),now);
        CardRules.require(result.uid().equals(card.uid()) && result.profile().equals(card.profile()),"SCAN_BINDING_INVALID");
        var rules=store.jdbc.query("SELECT setting_key,value_int,version FROM system_settings WHERE setting_key=?",
                (rs,n)->new Rule(rs.getString(1),rs.getInt(2),rs.getLong(3)),"return_hours_"+r.categoryCode());
        if(rules.isEmpty()) throw new ApiFailure(503,"SERVICE_UNAVAILABLE","The demonstration return rule is unavailable.");
        var rule=rules.getFirst(); Instant due=now.plus(rule.hours(),ChronoUnit.HOURS); String id=uuid(),reference="P-DEMO-"+uuid().replace("-","");
        store.jdbc.update("INSERT INTO card_assignments(id,pass_reference,card_id,registration_id,issue_counter_id,return_counter_id,issued_by,issued_at,due_at,return_rule_key,return_rule_version,handover_confirmed_at,operation_origin,environment) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'SIMULATED',?)",
                id,reference,card.id(),LifecycleInput.decimal(plan.registration()),plan.counter(),plan.counter(),actor,DatabaseTime.sql(now),DatabaseTime.sql(due),rule.key(),rule.version(),DatabaseTime.sql(now),properties.environment());
        changeCard(card,"ISSUED"); consume(plan,now);
        event("ISSUED",card.id(),id,LifecycleInput.decimal(plan.registration()),actor,card.status(),"ISSUED",card.version(),card.version()+1,null,now);
        return new SafeResult(id,reference,"ISSUED",0);
    }

    private SafeResult returned(LifecycleInput input,Plan plan,Locked locked,LifecycleSecurity.Context context,long actor,Instant now) {
        var a=locked.assignment(); var card=locked.card(); CardRules.version(a.version(),input.version());
        CardRules.require(a.closed()==null && Set.of("ISSUED","OVERDUE").contains(card.status()),"CARD_STATE_CONFLICT");
        CardRules.require(input.bool("physicalReceived"),"RECEIPT_CONFIRMATION_REQUIRED");
        var result=evidence(plan,locked,context,actor,"RETURN",a.id(),now);
        CardRules.require(result.uid().equals(card.uid()) && result.profile().equals(card.profile()),"SCAN_BINDING_INVALID");
        // A return at/after the deadline records the overdue transition even if the periodic monitor has not run yet.
        overdueLocked(a,card,now);
        int changed=store.jdbc.update("UPDATE card_assignments SET closed_at=?,closure_reason='RETURNED',returned_at=?,returned_by=?,version=version+1 WHERE id=? AND closed_at IS NULL AND version=?",
                DatabaseTime.sql(now),DatabaseTime.sql(now),actor,a.id(),a.version());
        CardRules.require(changed==1,"VERSION_CONFLICT");
        var current=store.card(card.id(),false); changeCard(current,"AVAILABLE"); consume(plan,now);
        store.jdbc.update("UPDATE overdue_alerts SET resolved_at=? WHERE assignment_id=? AND resolved_at IS NULL",DatabaseTime.sql(now),a.id());
        event("RETURNED",card.id(),a.id(),a.registration(),actor,current.status(),"AVAILABLE",current.version(),current.version()+1,null,now);
        return new SafeResult(a.id(),a.reference(),"RETURNED",a.version()+1);
    }

    /** Lost closes the active loan and keeps an unresolved case; restore is an explicit DEMO policy, never a hospital approval. */
    private SafeResult inventoryAction(String operation,LifecycleInput input,Plan plan,Locked locked,LifecycleSecurity.Context context,long actor,Instant now) {
        var card=locked.card(); var a=locked.assignment(); CardRules.version(card.version(),input.version());
        String reason=input.text("reasonCode"),next;
        if(operation.equals("MARK_LOST")) {
            CardRules.require(Set.of("AVAILABLE","ISSUED","OVERDUE").contains(card.status()),"CARD_STATE_CONFLICT");
            requireReason(reason,Set.of("REPORTED_LOST","MISSING_DURING_CHECK")); next="LOST";
            if(a!=null) {
                CardRules.require(a.closed()==null,"ASSIGNMENT_STATE_CONFLICT");
                CardRules.require(a.version()<CardRules.MAX_VERSION,"VERSION_CONFLICT");
                int changed=store.jdbc.update("UPDATE card_assignments SET closed_at=?,closure_reason='LOST',version=version+1 WHERE id=? AND closed_at IS NULL AND version=?",
                        DatabaseTime.sql(now),a.id(),a.version());
                CardRules.require(changed==1,"VERSION_CONFLICT");
                store.jdbc.update("UPDATE overdue_alerts SET resolved_at=? WHERE assignment_id=? AND resolved_at IS NULL",DatabaseTime.sql(now),a.id());
            }
            store.jdbc.update("INSERT INTO lost_cases(id,card_id,assignment_id,opened_at,opened_by,reason_code) VALUES(?,?,?,?,?,?)",
                    uuid(),card.id(),a==null?null:a.id(),DatabaseTime.sql(now),actor,reason);
        } else if(operation.equals("DISABLE")) {
            CardRules.require(card.status().equals("AVAILABLE") && a==null,"CARD_STATE_CONFLICT");
            requireReason(reason,Set.of("DAMAGED","REMOVED_FROM_SERVICE")); next="DISABLED";
        } else {
            CardRules.require(Set.of("LOST","DISABLED").contains(card.status()) && a==null,"CARD_STATE_CONFLICT");
            CardRules.require(input.bool("physicalFoundConfirmed") && input.bool("inventoryCheckedConfirmed"),"RECOVERY_CONFIRMATION_REQUIRED");
            requireReason(reason,Set.of("DEMO_RECOVERED_AND_CHECKED"));
            var result=evidence(plan,locked,context,actor,"RESTORE",card.id(),now);
            CardRules.require(result.uid().equals(card.uid()) && result.profile().equals(card.profile()),"SCAN_BINDING_INVALID");
            if(card.status().equals("LOST")) {
                int updated=store.jdbc.update("UPDATE lost_cases SET resolved_at=?,resolved_by=?,recovery_scan_result_id=? WHERE unresolved_card_id=?",
                        DatabaseTime.sql(now),actor,result.id(),card.id()); CardRules.require(updated==1,"LOST_CASE_UNRESOLVED");
            }
            consume(plan,now); next="AVAILABLE";
        }
        changeCard(card,next);
        event(operation.equals("MARK_LOST")?"MARKED_LOST":operation.equals("DISABLE")?"DISABLED":"RESTORED",card.id(),a==null?null:a.id(),
                a==null?null:a.registration(),actor,card.status(),next,card.version(),card.version()+1,reason,now);
        return new SafeResult(card.id(),card.code(),operation.equals("RESTORE")?"RESTORED":next,card.version()+1);
    }

    /** Internal followup is restricted to the active due assignment and cannot enqueue an external notification. */
    private SafeResult followup(LifecycleInput input,Locked locked,long actor,Instant now) {
        var a=locked.assignment(); requireOverdue(a,now);
        String reason=input.text("reasonCode"); requireReason(reason,Set.of("CONTACT_ATTEMPTED","CONTACTED_RETURN_REQUESTED","NO_ANSWER","ESCALATED_INTERNALLY"));
        overdueLocked(a,locked.card(),now); String id=uuid();
        store.jdbc.update("INSERT INTO assignment_followups(id,assignment_id,actor_id,reason_code,created_at) VALUES(?,?,?,?,?)",id,a.id(),actor,reason,DatabaseTime.sql(now));
        store.jdbc.update("UPDATE overdue_alerts SET last_followup_at=? WHERE assignment_id=?",DatabaseTime.sql(now),a.id());
        event("FOLLOWUP_RECORDED",a.cardId(),a.id(),a.registration(),actor,null,"FOLLOWUP_RECORDED",null,null,reason,now);
        return new SafeResult(id,null,"FOLLOWUP_RECORDED",0);
    }

    /** A replay never stores PII. Each actual reveal and its audit share one freshly authorized transaction. */
    Reveal reveal(LifecycleSecurity.Context context,String id,String key,String body) {
        if(TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("Reveal starts outside a domain transaction");
        for(int attempt=0;attempt<2;attempt++) {
            var actor=security.preflight(context,false); var a=store.assignment(LifecycleInput.uuid(id),false);
            if(!a.environment().equals(properties.environment())) throw CardRules.unavailable();
            var input=LifecycleInput.parse(json,"CONTACT_REVEAL",body);
            requireReason(input.text("reasonCode"),Set.of("OVERDUE_RETURN_FOLLOWUP"));
            var scope=new RequestEncoding.Scope(RequestEncoding.Kind.USER,Long.toString(actor.id()));
            var namespace=new IdempotencyPort.Namespace(scope,"CONTACT_REVEAL",id,IdempotencyPort.key(key));
            byte[] encoding=input.encoding(json,scope,"CONTACT_REVEAL",id); boolean recovery=attempt>0;
            try {
                return tx.execute(status->{
                    security.lock(context,false,List.of(a.counter()));
                    var replay=idem.replay(namespace,encoding);
                    if(recovery && replay.isEmpty()) throw new ApiFailure(409,"IDEMPOTENCY_CONFLICT","Check the original reveal command.");
                    var registration=roots.lockLifecycle(roots.discover(Long.toString(a.registration())),context.owner());
                    var card=store.card(a.cardId(),true); var current=store.assignment(a.id(),true); Instant now=clock.instant();
                    if(current.returnCounter()!=a.counter()) throw CardRules.unavailable(); requireOverdue(current,now);
                    replay=idem.replay(namespace,encoding); overdueLocked(current,card,now);
                    var contact=roots.lifecycleContact(registration);
                    event("CONTACT_REVEALED",card.id(),current.id(),current.registration(),actor.id(),null,"CONTACT_REVEALED",null,null,"OVERDUE_RETURN_FOLLOWUP",now);
                    if(replay.isEmpty()) idem.success(namespace,encoding,200,new SafeResult(current.id(),current.reference(),"OVERDUE",current.version()));
                    return new Reveal(current.id(),contact.phone(),now.plusSeconds(30),"SIMULATED");
                });
            } catch(DuplicateKeyException conflict) {
                if(attempt==1) throw new ApiFailure(409,"IDEMPOTENCY_CONFLICT","Check the original reveal command.");
            }
        }
        throw new IllegalStateException("Reveal command did not produce a result");
    }

    /** Monitor and request paths share this transition under the same root/card/assignment order. */
    private void overdueLocked(Assignment a,Card card,Instant now) {
        if(a.closed()!=null || now.isBefore(a.due()) || !card.status().equals("ISSUED")) return;
        changeCard(card,"OVERDUE");
        store.jdbc.update("INSERT INTO overdue_alerts(assignment_id,created_at) VALUES(?,?)",a.id(),DatabaseTime.sql(now));
        event("OVERDUE",card.id(),a.id(),a.registration(),null,"ISSUED","OVERDUE",card.version(),card.version()+1,null,now);
    }
    private void requireOverdue(Assignment a,Instant now) { CardRules.require(a.closed()==null && !now.isBefore(a.due()),"ASSIGNMENT_NOT_OVERDUE"); }
    private void requireReason(String value,Set<String> allowed) { if(!allowed.contains(value)) throw LifecycleInput.invalid(); }
    private void changeCard(Card card,String next) {
        CardRules.require(card.version()<CardRules.MAX_VERSION,"VERSION_CONFLICT");
        int changed=store.jdbc.update("UPDATE cards SET status=?,version=version+1 WHERE id=? AND status=? AND version=?",next,card.id(),card.status(),card.version());
        CardRules.require(changed==1,"VERSION_CONFLICT");
    }
    private void event(String type,String card,String assignment,Long registration,Long actor,String previous,String state,Long oldVersion,Long version,String reason,Instant now) {
        String event=audit.append(LocalAuditPort.Action.valueOf(type),"CARD",card,actor,new LocalAuditPort.Snapshot(previous,state,oldVersion,version,"SIMULATED"));
        store.jdbc.update("INSERT INTO lifecycle_events(id,assignment_id,card_id,registration_id,event_type,actor_id,occurred_at,reason_code,commitment_event_id) VALUES(?,?,?,?,?,?,?,?,?)",
                uuid(),assignment,card,registration,type,actor,DatabaseTime.sql(now),reason,event);
    }
    /** One assignment per transaction bounds lock duration; failures retry on a later monitor tick without external work. */
    public void markOverdueBatch() {
        var ids=store.jdbc.query("SELECT a.id FROM card_assignments a JOIN cards c ON c.id=a.card_id WHERE a.closed_at IS NULL AND a.due_at<=? AND c.status='ISSUED' AND a.environment=? AND c.environment=? ORDER BY a.due_at,a.id LIMIT 50",
                (rs,n)->rs.getString(1),DatabaseTime.sql(clock.instant()),properties.environment(),properties.environment());
        for(String id:ids) {
            var discovered=store.assignment(id,false);
            tx.executeWithoutResult(status->{
                reviewRoots.lock(reviewRoots.discover(Long.toString(discovered.registration())));
                var card=store.card(discovered.cardId(),true); var current=store.assignment(id,true);
                overdueLocked(current,card,clock.instant());
            });
        }
    }

    /** Read endpoints recheck current authority even though the shell has already selected a role/counter. */
    List<ReaderPort.Sample> samples(LifecycleSecurity.Context context,boolean admin) { security.preflight(context,admin); return reader.samples(); }
    List<CounterView> counters(LifecycleSecurity.Context context) {
        security.preflight(context,true);
        return tx.execute(status->{security.lock(context,true,List.of()); return store.jdbc.query("SELECT id,code,name FROM counters WHERE active=TRUE ORDER BY id",
                (rs,n)->new CounterView(Long.toString(rs.getLong(1)),rs.getString(2),rs.getString(3)));});
    }
    Page<CardView> cards(LifecycleSecurity.Context context,int page) {
        security.preflight(context,true);
        return tx.execute(status->{security.lock(context,true,List.of());
            long total=Objects.requireNonNull(store.jdbc.queryForObject("SELECT COUNT(*) FROM cards WHERE environment=?",Long.class,properties.environment()));
            return new Page<>(page,25,total,store.inventory(page,properties.environment()),clock.instant()); });
    }
    Page<AssignmentView> assignments(LifecycleSecurity.Context context,long counter,int page,boolean overdue) {
        security.preflight(context,false);
        return tx.execute(status->{security.lock(context,false,List.of(counter)); Instant now=clock.instant();
            Long total=overdue?store.jdbc.queryForObject("SELECT COUNT(*) FROM card_assignments WHERE issue_counter_id=? AND return_counter_id=? AND environment=? AND closed_at IS NULL AND due_at<=?",Long.class,counter,counter,properties.environment(),DatabaseTime.sql(now)):
                    store.jdbc.queryForObject("SELECT COUNT(*) FROM card_assignments WHERE issue_counter_id=? AND return_counter_id=? AND environment=?",Long.class,counter,counter,properties.environment());
            return new Page<>(page,25,total==null?0:total,store.assignments(counter,page,overdue,now,properties.environment()),now); });
    }
    AssignmentView assignment(LifecycleSecurity.Context context,String id) {
        security.preflight(context,false); var a=store.assignment(LifecycleInput.uuid(id),false);
        return tx.execute(status->{security.lock(context,false,List.of(a.counter())); var current=store.assignment(a.id(),false);
            if(current.returnCounter()!=a.counter() || !current.environment().equals(properties.environment())) throw CardRules.unavailable(); var card=store.card(a.cardId(),false);
            return view(current,card.code(),card.status(),clock.instant()); });
    }
    List<EventView> history(LifecycleSecurity.Context context,boolean admin,String id) {
        security.preflight(context,admin);
        if(admin) return tx.execute(status->{security.lock(context,true,List.of());
            if(!store.card(LifecycleInput.uuid(id),false).environment().equals(properties.environment())) throw CardRules.unavailable(); return store.history(id);});
        var a=store.assignment(LifecycleInput.uuid(id),false);
        if(!a.environment().equals(properties.environment())) throw CardRules.unavailable();
        return tx.execute(status->{security.lock(context,false,List.of(a.counter()));
            // Filter to this assignment so earlier loans at other counters cannot leak through reusable card history.
            return store.jdbc.query("SELECT id,assignment_id,event_type,actor_id,occurred_at,reason_code FROM lifecycle_events WHERE assignment_id=? ORDER BY occurred_at DESC,id DESC LIMIT 100",
                    (rs,n)->new EventView(rs.getString(1),rs.getString(2),rs.getString(3),rs.getObject(4)==null?"SYSTEM":Long.toString(rs.getLong(4)),time(rs,"occurred_at"),rs.getString(6)),a.id()); });
    }
    JobView job(LifecycleSecurity.Context context,boolean admin,String id) {
        var actor=security.preflight(context,admin); var discovered=store.job(LifecycleInput.uuid(id),false);
        if(!discovered.environment().equals(properties.environment())) throw CardRules.unavailable();
        return tx.execute(status->{security.lock(context,admin,List.of(discovered.counter())); var current=store.job(id,false); requireOwner(current,context,actor.id());
            Instant now=clock.instant(); boolean live=Set.of("CLAIMED","SUCCEEDED").contains(current.status()) && now.isBefore(current.expires());
            var result=store.resultForJob(current.id());
            return new JobView(current.id(),current.device(),Long.toString(current.counter()),current.purpose(),current.target(),
                    !now.isBefore(current.expires()) && Set.of("CLAIMED","SUCCEEDED").contains(current.status())?"EXPIRED":current.status(),current.expires(),
                    live?capability("NONCE",id,current.keyVersion()):null,live?capability("LEASE",id,current.keyVersion()):null,
                    result==null?null:result.id(),result==null?null:result.sample(),"SIMULATED",now); });
    }
    private String capability(String kind,String id,String version) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(idem.hash(("HSAAS_SCAN_"+kind+"_V1:"+id).getBytes(StandardCharsets.UTF_8),version));
    }
    private static byte[] digest(String value) {
        try { return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)); }
        catch(java.security.NoSuchAlgorithmException failure) { throw new IllegalStateException("SHA-256 unavailable"); }
    }
    private static String deviceId(long counter) { return UUID.nameUUIDFromBytes(("HSAAS_SIMULATED_READER_V1:"+counter).getBytes(StandardCharsets.UTF_8)).toString(); }
    private record Rule(String key,int hours,long version) { }
    private record Plan(String target,Long counter,String registration,String card,String assignment,String job,String result,String device) { }
    private record Locked(Device device,RegistrationLifecyclePort.Access registration,Card card,Assignment assignment,Long enrollmentCategory) { }
    public record Reveal(String assignmentId,String phone,Instant expiresAt,String source) { @Override public String toString() { return "Reveal[REDACTED]"; } }
    public record CounterView(String id,String code,String name) { }
}
