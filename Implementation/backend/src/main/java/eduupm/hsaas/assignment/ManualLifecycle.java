package eduupm.hsaas.assignment;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.card.CardRules;
import eduupm.hsaas.common.*;
import eduupm.hsaas.common.IdempotencyPort.SafeResult;
import eduupm.hsaas.registration.RegistrationLifecyclePort;
import static eduupm.hsaas.assignment.LifecycleStore.*;

/** Manual operations share the existing authority, root, audit and replay transaction boundaries. */
final class ManualLifecycle {
    private final LifecycleService service;
    private final LifecycleStore store;
    private final LifecycleSecurity security;
    private final RegistrationLifecyclePort roots;
    private final IdempotencyPort idem;
    private final LocalAuditPort audit;
    private final JsonMapper json;
    private final Clock clock;
    private final String environment;
    ManualLifecycle(LifecycleService service,LifecycleStore store,LifecycleSecurity security,RegistrationLifecyclePort roots,
            IdempotencyPort idem,LocalAuditPort audit,JsonMapper json,Clock clock,String environment) {
        this.service=service; this.store=store; this.security=security; this.roots=roots; this.idem=idem;
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
                    var current=security.lock(context,admin,plan.counter()==null?List.of():List.of(plan.counter()));
                    var replay=idem.replay(namespace,encoding);
                    if(replay.isPresent()) return replay.get().result();
                    if(recovering) throw new ApiFailure(409,"IDEMPOTENCY_CONFLICT","Check the original command before retrying.");
                    // Root/reference locks always precede card locks. No registration SQL exists in this module.
                    var root=plan.registration()==null?null:roots.lockLifecycle(roots.discover(plan.registration()),context.owner());
                    if(root!=null) requireRoot(root);
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
                        case "ISSUE" -> issue(input,root,cards,current.id(),now);
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
        if(operation.equals("CARD_ENROLL")) return new Plan("REGISTER",null,null,List.of(),List.of());
        if(operation.equals("RESTORE")) return new Plan(LifecycleInput.uuid(target),null,null,List.of(target),List.of());
        String registration; var cards=new ArrayList<String>(); var assignments=new ArrayList<String>();
        if(operation.equals("ISSUE")) {
            registration=Long.toString(LifecycleInput.decimal(input.text("registrationId")));
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
        long counter=LifecycleInput.decimal(roots.discover(registration).counterId());
        return new Plan(operation.equals("RETURN")?target:registration,registration,counter,List.copyOf(cards),List.copyOf(assignments));
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

    /** Enrollment locks reference rows in stable category/destination order; ADMIN never acquires staff capabilities. */
    private SafeResult enroll(ManualInput input,long actor,Instant now) {
        String code=input.text("cardCode"),category=input.text("categoryCode");
        if(!Set.of("EXECUTIVE","PENJAGA","VENDOR","CONTRACTOR").contains(category)) throw LifecycleInput.invalid();
        var categories=store.jdbc.query("SELECT id FROM visitor_categories WHERE code=? AND active=TRUE FOR SHARE",(rs,n)->rs.getLong(1),category);
        CardRules.require(!categories.isEmpty(),"CARD_CATEGORY_UNAVAILABLE");
        long destination=LifecycleInput.decimal(input.text("destinationId"));
        var destinations=store.jdbc.query("SELECT id FROM destinations WHERE id=? AND active=TRUE FOR SHARE",(rs,n)->rs.getLong(1),destination);
        CardRules.require(!destinations.isEmpty(),"CARD_DESTINATION_MISMATCH");
        String id=uuid();
        store.jdbc.update("INSERT INTO cards(id,card_code,category_id,category_code,status,enrolled_by,enrolled_at,data_origin,environment,enrollment_method,destination_id) VALUES(?,?,?,?,'AVAILABLE',?,?,'SYNTHETIC',?,'MANUAL',?)",
                id,code,categories.getFirst(),category,actor,DatabaseTime.sql(now),environment,destination);
        event("CARD_REGISTERED",id,null,null,actor,null,"AVAILABLE",null,0L,null,now);
        return new SafeResult(id,code,"AVAILABLE",0);
    }

    /** A registration lock serializes its category cardinality; database unique indexes are an additional fence. */
    private SafeResult issue(ManualInput input,RegistrationLifecyclePort.Access root,Map<String,Card> cards,long actor,Instant now) {
        CardRules.version(root.version(),input.version());
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
            var destination=root.destinations().stream().filter(value->value.id().equals(selection.destination())).findFirst().orElseThrow(CardRules::unavailable);
            Long bound=store.jdbc.queryForObject("SELECT destination_id FROM cards WHERE id=?",Long.class,card.id());
            CardRules.require(bound==null || bound==LifecycleInput.decimal(destination.id()),"CARD_DESTINATION_MISMATCH");
            CardRules.require(selection.due()==null || selection.due().isAfter(now),"DEADLINE_INVALID");
            String id=uuid(),reference="P-DEMO-"+uuid().replace("-","");
            store.jdbc.update("INSERT INTO card_assignments(id,pass_reference,card_id,registration_id,issue_counter_id,return_counter_id,issued_by,issued_at,due_at,return_rule_key,return_rule_version,handover_confirmed_at,operation_origin,environment,category_code,data_origin,destination_id,destination_code,destination_name) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'MANUAL',?,?,'SYNTHETIC',?,?,?)",
                    id,reference,card.id(),registration,LifecycleInput.decimal(root.coordinates().counterId()),LifecycleInput.decimal(root.coordinates().counterId()),actor,
                    DatabaseTime.sql(now),selection.due()==null?null:DatabaseTime.sql(selection.due()),rule.key(),rule.version(),DatabaseTime.sql(now),environment,
                    root.categoryCode(),LifecycleInput.decimal(destination.id()),destination.code(),destination.label());
            service.changeCard(card,"ISSUED");
            event("ISSUED",card.id(),id,registration,actor,card.status(),"ISSUED",card.version(),card.version()+1,null,now);
        }
        return new SafeResult(Long.toString(registration),null,"ISSUED",root.version());
    }

    /** Only selected, physically received active loans close; unselected loans retain their exact state. */
    private SafeResult returned(String operation,ManualInput input,Plan plan,Map<String,Assignment> assignments,Map<String,Card> cards,long actor,Instant now) {
        CardRules.require(input.bool("physicalReceived"),"RECEIPT_CONFIRMATION_REQUIRED");
        var selections=operation.equals("RETURN")?List.of(new ManualInput.Selection(plan.target(),input.version(),null,null)):input.passes(false);
        for(var selection:selections) {
            var assignment=assignments.get(selection.id()); requireAssignment(assignment);
            if(!Long.toString(assignment.registration()).equals(plan.registration()) || assignment.counter()!=plan.counter()
                    || assignment.returnCounter()!=plan.counter() || !cards.containsKey(assignment.cardId())) throw CardRules.unavailable();
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
    private record Plan(String target,String registration,Long counter,List<String> cards,List<String> assignments) { }
}
