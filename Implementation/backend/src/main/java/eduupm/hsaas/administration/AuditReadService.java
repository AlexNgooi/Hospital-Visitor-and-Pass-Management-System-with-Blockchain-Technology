package eduupm.hsaas.administration;

import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.MultiValueMap;
import eduupm.hsaas.auth.AccountChanges.Proof;
import eduupm.hsaas.common.*;
import eduupm.hsaas.reporting.ReportFilter;

/** Bounded local-only audit projection exposes safe snapshots and configuration history, never entity/request bodies. */
@Service
public class AuditReadService {
    private final JdbcTemplate jdbc;private final TransactionTemplate tx;private final AdminAccess access;private final Clock clock;
    public AuditReadService(JdbcTemplate jdbc,TransactionTemplate tx,AdminAccess access,Clock clock){this.jdbc=jdbc;this.tx=new TransactionTemplate(tx.getTransactionManager());this.tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);this.access=access;this.clock=clock;}
    /** Date, actor and action filters use parameters; duplicate or unknown fields fail closed. */
    public Page read(Proof proof,MultiValueMap<String,String> query){
        if(query.entrySet().stream().anyMatch(e->!Set.of("from","to","actorId","action","page").contains(e.getKey())||e.getValue().size()!=1))throw AdminInputs.invalid();
        var dates=new org.springframework.util.LinkedMultiValueMap<String,String>();for(String key:List.of("from","to"))if(query.containsKey(key))dates.add(key,query.getFirst(key));
        var range=ReportFilter.parse(dates,clock);Long actor=query.containsKey("actorId")?AdminInputs.id(query.getFirst("actorId")):null;
        String action=query.getFirst("action");if(action!=null&&Arrays.stream(LocalAuditPort.Action.values()).noneMatch(a->a.name().equals(action)))throw AdminInputs.invalid();
        int page=0;try{if(query.containsKey("page"))page=Integer.parseInt(query.getFirst("page"));}catch(NumberFormatException failure){throw AdminInputs.invalid();}if(page<0||page>1000)throw AdminInputs.invalid();
        int offset=page*100;
        return tx.execute(status->{access.require(proof);var args=new ArrayList<Object>(List.of(range.start(),range.end()));
            String scope=actor==null?"":" AND actor_id=?";if(actor!=null)args.add(actor);
            var auditArgs=new ArrayList<>(args);String actionScope=action==null?"":" AND action=?";if(action!=null)auditArgs.add(action);auditArgs.add(offset);
            var events=jdbc.query("SELECT event_id,action,target_ref,actor_id,safe_snapshot,occurred_at FROM audit_events WHERE occurred_at>=? AND occurred_at<?"+scope+actionScope+" ORDER BY occurred_at DESC,event_id DESC LIMIT 101 OFFSET ?",(rs,n)->new Event(rs.getString(1),rs.getString(2),rs.getString(3),rs.getObject(4)==null?null:Long.toString(rs.getLong(4)),rs.getString(5),DatabaseTime.instant(rs.getObject(6,LocalDateTime.class))),auditArgs.toArray());
            // History uses the same MYT/actor filters; action filters apply to the event stream only and are labelled in the UI.
            args.add(offset);
            var history=jdbc.query("SELECT id,entity_kind,entity_id,previous_version,version,previous_value,current_value,reason_code,actor_id,changed_at FROM administration_history WHERE changed_at>=? AND changed_at<?"+scope+" ORDER BY changed_at DESC,id DESC LIMIT 101 OFFSET ?",(rs,n)->new Change(Long.toString(rs.getLong(1)),rs.getString(2),rs.getString(3),rs.getObject(4)==null?null:rs.getLong(4),rs.getLong(5),rs.getString(6),rs.getString(7),rs.getString(8),Long.toString(rs.getLong(9)),DatabaseTime.instant(rs.getObject(10,LocalDateTime.class))),args.toArray());
            return new Page(clock.instant(),"LOCAL_ONLY",events.size()>100,history.size()>100,events.stream().limit(100).toList(),history.stream().limit(100).toList());
        });
    }
    public record Event(String id,String action,String target,String actorId,String snapshot,Instant occurredAt){}
    public record Change(String id,String kind,String target,Long previousVersion,long version,String previousValue,String currentValue,String reason,String actorId,Instant occurredAt){}
    public record Page(Instant serverUpdatedAt,String auditStatus,boolean moreEvents,boolean moreHistory,List<Event> events,List<Change> changes){}
}
