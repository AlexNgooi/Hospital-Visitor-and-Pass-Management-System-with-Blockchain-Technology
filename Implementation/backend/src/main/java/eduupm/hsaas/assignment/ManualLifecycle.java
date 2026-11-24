package eduupm.hsaas.assignment;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.card.CardRules;
import eduupm.hsaas.card.PassNaming;
import eduupm.hsaas.common.*;
import eduupm.hsaas.common.IdempotencyPort.SafeResult;
import eduupm.hsaas.registration.RegistrationLifecyclePort;
import eduupm.hsaas.registration.RegistrationReviewPort;
import eduupm.hsaas.registration.ManualEvidence;
import static eduupm.hsaas.assignment.LifecycleStore.*;

/** Manual operations share the existing authority, root, audit and replay transaction boundaries. */
final class ManualLifecycle {
    private final LifecycleService service;
    private final LifecycleStore store;
    private final LifecycleSecurity security;
    private final RegistrationLifecyclePort roots;
    private final RegistrationReviewPort reviews;
    private final IdempotencyPort idem;
    private final LocalAuditPort audit;
    private final JsonMapper json;
    private final Clock clock;
    private final String environment;
    ManualLifecycle(LifecycleService service,LifecycleStore store,LifecycleSecurity security,RegistrationLifecyclePort roots,RegistrationReviewPort reviews,
            IdempotencyPort idem,LocalAuditPort audit,JsonMapper json,Clock clock,String environment) {
        this.service=service; this.store=store; this.security=security; this.roots=roots; this.reviews=reviews; this.idem=idem;
        this.audit=audit; this.json=json; this.clock=clock; this.environment=environment;
    }

    /** Duplicate-key recovery reads a committed winner only; it never repeats a failed batch mutation. */
    SafeResult command(LifecycleSecurity.Context context,boolean admin,String operation,String target,String key,String body) {
        if(TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("Manual lifecycle requires its own transaction");
        for(int attempt=0;attempt<2;attempt++) {
            var actor=security.preflight(context,admin);
            if(admin!=Set.of("CARD_ENROLL","RESTORE").contains(operation)) throw new ApiFailure(403,"ACCESS_DENIED","This role cannot perform the manual action.");
            var input=ManualInput.parse(json,operation,body);
            var plan=discover(operation,target,input);
            var scope=new RequestEncoding.Scope(RequestEncoding.Kind.USER,Long.toString(actor.id()));
            var namespace=new IdempotencyPort.Namespace(scope,operation,plan.target(),IdempotencyPort.key(key));
            byte[] encoding=input.encoding(json,scope,operation,plan.target()); boolean recovering=attempt>0;
            try {
                return service.tx.execute(status->{
                    var current=security.lock(context,admin);
                    var replay=idem.replay(namespace,encoding);
                    if(replay.isPresent()) return replay.get().result();
                    if(recovering) throw new ApiFailure(409,"IDEMPOTENCY_CONFLICT","Check the original command before retrying.");
                    // Root/reference locks always precede card locks. No registration SQL exists in this module.
                    var root=plan.registration()==null?null:roots.lockLifecycle(roots.discover(plan.registration()),context.owner());
                    if(root!=null) requireRoot(root);
                    // A waiting duplicate must see its winner before attempting a new approval transition.
                    replay=idem.replay(namespace,encoding);
                    if(replay.isPresent()) return replay.get().result();
                    boolean approvedNow=Set.of("APPROVE_ISSUE","APPROVE_NO_PASS").contains(operation);
                    if(approvedNow) {
                        CardRules.require(input.bool("reviewConfirmed"),"REVIEW_CONFIRMATION_REQUIRED");
                        var receipt=reviews.lock(reviews.discover(plan.registration()));
                        boolean penjaga=root.categoryCode().equals("PENJAGA");
                        var basis=penjaga?List.of("IDENTITY_MATCH_CONFIRMED","MRN_MATCH_CONFIRMED","WARD_MATCH_CONFIRMED"):List.of("IDENTITY_MATCH_CONFIRMED");
                        // The final staff action attests comparison; only physical issue also attests handover.
                        var decision=new RegistrationReviewPort.Verified(true,penjaga?true:null,penjaga?true:null,
                                new ManualEvidence("SYNTHETIC_RECORD_COMPARISON",basis));
                        var approved=reviews.recordDecision(receipt,input.version(),context.owner(),decision);
                        if(!approved.id().equals(plan.registration()) || !approved.status().equals("VERIFIED") || approved.version()!=input.version()+1)
                            throw new IllegalStateException("Registration approval violated its decision contract");
                        audit.append(LocalAuditPort.Action.REGISTRATION_VERIFIED,"REGISTRATION",plan.registration(),current.id(),
                                new LocalAuditPort.Snapshot(receipt.status(),approved.status(),receipt.version(),approved.version(),"SYNTHETIC_MANUAL"));
                        // Reference locks were already acquired above; reread the updated root before sorted card locks.
                        root=roots.lockLifecycle(roots.discover(plan.registration()),context.owner());
                    }
                    var cards=new TreeMap<String,Card>();
                    for(String id:plan.cards().stream().distinct().sorted().toList()) {
                        var card=store.card(id,true); requireCard(card); cards.put(id,card);
                    }
                    var assignments=new TreeMap<String,Assignment>();
                    for(String id:plan.assignments().stream().sorted().toList()) assignments.put(id,store.assignment(id,true));
                    replay=idem.replay(namespace,encoding);
                    if(replay.isPresent()) return replay.get().result();
                    Instant now=clock.instant().truncatedTo(ChronoUnit.MICROS);
                    SafeResult result=switch(operation) {
                        case "CARD_ENROLL" -> enroll(input,current.id(),now);
                        case "ISSUE","APPROVE_ISSUE" -> issue(input,root,cards,current.id(),now,approvedNow);
                        case "NO_PASS","APPROVE_NO_PASS" -> noPass(input,root,current.id(),approvedNow);
                        case "RETURN","RETURN_BATCH" -> returned(operation,input,plan,assignments,cards,current.id(),now);
                        case "RESTORE" -> restore(input,cards.get(plan.cards().getFirst()),current.id(),now);
                        default -> throw new IllegalStateException("Unknown manual operation");
                    };
                    idem.success(namespace,encoding,200,result); return result;
                });
            } catch(DuplicateKeyException conflict) {
                if(attempt==1) throw new ApiFailure(409,"IDEMPOTENCY_CONFLICT","Refresh and check the original command.");
            }
        }
        throw new IllegalStateException("Manual command produced no result");
    }

    /** Discovery supplies immutable coordinates only; current locked rows are checked again before any write. */
    private Plan discover(String operation,String target,ManualInput input) {
        if(operation.equals("CARD_ENROLL")) return new Plan("REGISTER",null,List.of(),List.of());
        if(operation.equals("RESTORE")) return new Plan(LifecycleInput.uuid(target),null,List.of(target),List.of());
        String registration; var cards=new ArrayList<String>(); var assignments=new ArrayList<String>();
        if(Set.of("ISSUE","APPROVE_ISSUE","NO_PASS","APPROVE_NO_PASS").contains(operation)) {
            registration=Long.toString(LifecycleInput.decimal(input.text("registrationId")));
            if(operation.equals("ISSUE") || operation.equals("APPROVE_ISSUE"))
                for(var selection:input.passes(true)) cards.add(selection.id());
        } else {
            var ids=operation.equals("RETURN")?List.of(LifecycleInput.uuid(target)):input.passes(false).stream().map(ManualInput.Selection::id).toList();
            registration=operation.equals("RETURN_BATCH")?Long.toString(LifecycleInput.decimal(input.text("registrationId"))):null;
            for(String id:ids) {
                var assignment=store.assignment(id,false); requireAssignment(assignment);
                if(registration==null) registration=Long.toString(assignment.registration());
                if(!registration.equals(Long.toString(assignment.registration()))) throw CardRules.unavailable();
                cards.add(assignment.cardId()); assignments.add(id);
            }
        }
        return new Plan(operation.equals("RETURN")?target:registration,registration,List.copyOf(cards),List.copyOf(assignments));
    }
    private void requireRoot(RegistrationLifecyclePort.Access root) {
        if(!root.environment().equals(environment) || !root.origin().equals("SYNTHETIC")) throw CardRules.unavailable();
    }
    private void requireCard(Card card) {
        if(!card.environment().equals(environment) || !Set.of("SIMULATED","SYNTHETIC").contains(card.origin())) throw CardRules.unavailable();
    }
    private void requireAssignment(Assignment assignment) {
        if(!assignment.environment().equals(environment) || !Set.of("SIMULATED","MANUAL").contains(assignment.origin())) throw CardRules.unavailable();
    }

    /** Enrollment locks its category only; physical stock has no destination and ADMIN acquires no staff capability. */
    private SafeResult enroll(ManualInput input,long actor,Instant now) {
        String category=input.text("categoryCode");
        String code=PassNaming.canonical(category,input.text("cardCode"));
        var categories=store.jdbc.query("SELECT id FROM visitor_categories WHERE code=? AND active=TRUE FOR SHARE",(rs,n)->rs.getLong(1),category);
        CardRules.require(!categories.isEmpty(),"CARD_CATEGORY_UNAVAILABLE");
        // The global unique key remains the concurrent fence; this read supplies a clear ordinary duplicate error.
        Long duplicate=store.jdbc.queryForObject("SELECT COUNT(*) FROM cards WHERE card_code=?",Long.class,code);
        CardRules.require(duplicate!=null && duplicate==0,"CARD_ALREADY_ENROLLED");
        String id=uuid();
        store.jdbc.update("INSERT INTO cards(id,card_code,category_id,category_code,status,enrolled_by,enrolled_at,data_origin,environment,enrollment_method,destination_id) VALUES(?,?,?,?,'AVAILABLE',?,?,'SYNTHETIC',?,'MANUAL',NULL)",
                id,code,categories.getFirst(),category,actor,DatabaseTime.sql(now),environment);
        event("CARD_REGISTERED",id,null,null,actor,null,"AVAILABLE",null,0L,null,now);
        return new SafeResult(id,code,"AVAILABLE",0);
    }

    /** A registration lock serializes its category cardinality; database unique indexes are an additional fence. */
    private SafeResult issue(ManualInput input,RegistrationLifecyclePort.Access root,Map<String,Card> cards,long actor,Instant now,boolean approvedNow) {
        // Review, inventory, assignments, audit and replay commit together; any failed card rolls everything back.
        CardRules.version(root.version(),input.version()+(approvedNow?1:0));
        CardRules.require(root.status().equals("VERIFIED"),"REGISTRATION_STATE_CONFLICT");
        CardRules.require(input.bool("handoverConfirmed"),"HANDOVER_CONFIRMATION_REQUIRED");
        var selections=input.passes(true); long registration=LifecycleInput.decimal(root.coordinates().id());
        if(!root.multipleActivePassesAllowed()) {
            Long active=store.jdbc.queryForObject("SELECT COUNT(*) FROM card_assignments WHERE active_registration_id=?",Long.class,registration);
            CardRules.require(selections.size()==1 && active!=null && active==0,"ASSIGNMENT_ALREADY_ACTIVE");
        }
        var rules=store.jdbc.query("SELECT setting_key,value_int,version FROM system_settings WHERE setting_key=?",
                (rs,n)->new ReturnDefault(rs.getString(1),(Integer)rs.getObject(2),rs.getLong(3)),"return_hours_"+root.categoryCode());
        if(rules.isEmpty()) throw new ApiFailure(503,"SERVICE_UNAVAILABLE","Return defaults are unavailable.");
        var rule=rules.getFirst();
        for(var selection:selections) {
            var card=cards.get(selection.id()); CardRules.version(card.version(),selection.version());
            CardRules.require(card.status().equals("AVAILABLE") && card.categoryId()==LifecycleInput.decimal(root.categoryId())
                    && card.category().equals(root.categoryCode()) && store.activeForCard(card.id())==null,"CARD_CATEGORY_MISMATCH");
            // Every new loan inherits the complete registered set; stock has no destination restriction.
            CardRules.require(!root.destinations().isEmpty(),"CARD_DESTINATION_MISMATCH");
            if(selection.destination()!=null) CardRules.require(root.destinations().stream().anyMatch(value->value.id().equals(selection.destination())),"CARD_DESTINATION_MISMATCH");
            CardRules.require(selection.due()==null || selection.due().isAfter(now),"DEADLINE_INVALID");
            String id=uuid(),reference="P-DEMO-"+uuid().replace("-","");
            store.jdbc.update("INSERT INTO card_assignments(id,pass_reference,card_id,registration_id,issued_by,issued_at,due_at,return_rule_key,return_rule_version,handover_confirmed_at,operation_origin,environment,category_code,data_origin,destination_scope) VALUES(?,?,?,?,?,?,?,?,?,?,'MANUAL',?,?,'SYNTHETIC','REGISTRATION')",
                    id,reference,card.id(),registration,actor,
                    DatabaseTime.sql(now),selection.due()==null?null:DatabaseTime.sql(selection.due()),rule.key(),rule.version(),DatabaseTime.sql(now),environment,
                    root.categoryCode());
            for(var destination:root.destinations()) store.jdbc.update("INSERT INTO assignment_destinations(assignment_id,destination_id,destination_code,destination_name) VALUES(?,?,?,?)",
                    id,LifecycleInput.decimal(destination.id()),destination.code(),destination.label());
            service.changeCard(card,"ISSUED");
            event("ISSUED",card.id(),id,registration,actor,card.status(),"ISSUED",card.version(),card.version()+1,null,now);
        }
        return new SafeResult(Long.toString(registration),null,"ISSUED",root.version());
    }

    /** Record the explicit disposition without inventing a card, assignment, handover or return obligation. */
    private SafeResult noPass(ManualInput input,RegistrationLifecyclePort.Access root,long actor,boolean approvedNow) {
        CardRules.version(root.version(),input.version()+(approvedNow?1:0));
        CardRules.require(root.status().equals("VERIFIED"),"REGISTRATION_STATE_CONFLICT");
        CardRules.require(input.bool("noPassConfirmed"),"NO_PASS_CONFIRMATION_REQUIRED");
        Long active=store.jdbc.queryForObject("SELECT COUNT(*) FROM card_assignments WHERE active_registration_id=?",Long.class,
                LifecycleInput.decimal(root.coordinates().id()));
        CardRules.require(active!=null && active==0,"ASSIGNMENT_ALREADY_ACTIVE");
        CardRules.require(!noPassRecorded(root.coordinates().id()),"NO_PASS_ALREADY_RECORDED");
        // Root locking serializes this decision with issuing; audit and replay share the approval transaction.
        audit.append(LocalAuditPort.Action.REGISTRATION_NO_PASS,"REGISTRATION",root.coordinates().id(),actor,
                new LocalAuditPort.Snapshot(root.status(),root.status(),root.version(),root.version(),"SYNTHETIC_MANUAL"));
        return new SafeResult(root.coordinates().id(),null,"VERIFIED",root.version());
    }

    /** Called only after current authority and registration locking, never as a public audit lookup. */
    boolean noPassRecorded(String registration) {
        return Boolean.TRUE.equals(store.jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM audit_events WHERE target_ref=? AND action='REGISTRATION_NO_PASS')",Boolean.class,
                "REGISTRATION:"+registration));
    }

    /** Only selected, physically received active loans close; unselected loans retain their exact state. */
    private SafeResult returned(String operation,ManualInput input,Plan plan,Map<String,Assignment> assignments,Map<String,Card> cards,long actor,Instant now) {
        CardRules.require(input.bool("physicalReceived"),"RECEIPT_CONFIRMATION_REQUIRED");
        var selections=operation.equals("RETURN")?List.of(new ManualInput.Selection(plan.target(),input.version(),null,null)):input.passes(false);
        for(var selection:selections) {
            var assignment=assignments.get(selection.id()); requireAssignment(assignment);
            if(!Long.toString(assignment.registration()).equals(plan.registration()) || !cards.containsKey(assignment.cardId())) throw CardRules.unavailable();
            var card=cards.get(assignment.cardId()); CardRules.version(assignment.version(),selection.version());
            CardRules.require(assignment.closed()==null && Set.of("ISSUED","OVERDUE").contains(card.status()),"CARD_STATE_CONFLICT");
            service.overdueLocked(assignment,card,now);
            int changed=store.jdbc.update("UPDATE card_assignments SET closed_at=?,closed_by=?,closure_reason='RETURNED',returned_at=?,returned_by=?,version=version+1 WHERE id=? AND closed_at IS NULL AND version=?",
                    DatabaseTime.sql(now),actor,DatabaseTime.sql(now),actor,assignment.id(),assignment.version());
            CardRules.require(changed==1,"VERSION_CONFLICT");
            var current=store.card(card.id(),false); service.changeCard(current,"AVAILABLE");
            store.jdbc.update("UPDATE overdue_alerts SET resolved_at=? WHERE assignment_id=? AND resolved_at IS NULL",DatabaseTime.sql(now),assignment.id());
            event("RETURNED",card.id(),assignment.id(),assignment.registration(),actor,current.status(),"AVAILABLE",current.version(),current.version()+1,null,now);
        }
        var single=assignments.get(selections.getFirst().id());
        return operation.equals("RETURN")?new SafeResult(single.id(),single.reference(),"RETURNED",single.version()+1):new SafeResult(plan.registration(),null,"RETURNED",0);
    }

    /** Manual restore requires explicit custody checks; it cannot change the lost loan's actual-return fields. */
    private SafeResult restore(ManualInput input,Card card,long actor,Instant now) {
        CardRules.version(card.version(),input.version());
        CardRules.require(Set.of("LOST","DISABLED").contains(card.status()) && store.activeForCard(card.id())==null,"CARD_STATE_CONFLICT");
        CardRules.require(input.bool("physicalFoundConfirmed") && input.bool("inventoryCheckedConfirmed"),"RECOVERY_CONFIRMATION_REQUIRED");
        if(!input.text("reasonCode").equals("DEMO_RECOVERED_AND_CHECKED")) throw LifecycleInput.invalid();
        if(card.status().equals("LOST")) {
            int changed=store.jdbc.update("UPDATE lost_cases SET resolved_at=?,resolved_by=?,recovery_method='MANUAL' WHERE unresolved_card_id=? AND resolved_at IS NULL",
                    DatabaseTime.sql(now),actor,card.id()); CardRules.require(changed==1,"LOST_CASE_UNRESOLVED");
        }
        service.changeCard(card,"AVAILABLE");
        event("RESTORED",card.id(),null,null,actor,card.status(),"AVAILABLE",card.version(),card.version()+1,"DEMO_RECOVERED_AND_CHECKED",now);
        return new SafeResult(card.id(),card.code(),"RESTORED",card.version()+1);
    }

    /** Audit carries only generated IDs and finite structural values, never card labels or patient data. */
    private void event(String type,String card,String assignment,Long registration,Long actor,String previous,String state,Long oldVersion,Long version,String reason,Instant now) {
        String commitment=audit.append(LocalAuditPort.Action.valueOf(type),"CARD",card,actor,new LocalAuditPort.Snapshot(previous,state,oldVersion,version,"SYNTHETIC_MANUAL"));
        store.jdbc.update("INSERT INTO lifecycle_events(id,assignment_id,card_id,registration_id,event_type,actor_id,occurred_at,reason_code,commitment_event_id) VALUES(?,?,?,?,?,?,?,?,?)",
                uuid(),assignment,card,registration,type,actor,DatabaseTime.sql(now),reason,commitment);
    }
    record ReturnDefault(String key,Integer hours,long version) { }
    private record Plan(String target,String registration,List<String> cards,List<String> assignments) { }
}
