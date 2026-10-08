package eduupm.hsaas.common;

import java.time.Clock;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

/** Append-only local auditing joins domain transactions and cannot silently fail after business commit. */
@Service
public class LocalAuditPort {
    private final JdbcTemplate jdbc;
    private final JsonMapper json;
    private final Clock clock;
    public LocalAuditPort(JdbcTemplate jdbc,JsonMapper json,Clock clock) { this.jdbc=jdbc; this.json=json; this.clock=clock; }

    /** No form data, credentials, MRN, or free notes are accepted by this structural whitelist. */
    @Transactional(propagation=Propagation.MANDATORY)
    public String append(Action action,String targetKind,String targetId,Long actorId,Snapshot snapshot) {
        if(!Set.of("USER","COUNTER","REGISTRATION","CATEGORY","DESTINATION","BOOTSTRAP").contains(targetKind)
                || targetId==null || !targetId.matches("[0-9]+|[0-9a-f-]{36}")) { throw new IllegalArgumentException("Invalid audit target"); }
        validateState(snapshot.previousState()); validateState(snapshot.state());
        if(snapshot.origin()!=null && !Set.of("LOCAL","SYNTHETIC_MANUAL","SIMULATED").contains(snapshot.origin())) {
            throw new IllegalArgumentException("Invalid audit origin");
        }
        String id=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO audit_events(event_id,action,target_ref,actor_id,snapshot_version,safe_snapshot,occurred_at) VALUES(?,?,?,?,1,?,?)",
                id,action.name(),targetKind+":"+targetId,actorId,json.writeValueAsString(snapshot),DatabaseTime.sql(clock.instant()));
        return id;
    }
    /** Restricts values as well as field names, preventing a nominal status field from carrying PII. */
    private static void validateState(String state) {
        if(state!=null && !Set.of("SUBMITTED","VERIFIED","REJECTED","CANCELLED","ACTIVE","INACTIVE","BOOTSTRAPPED","ENABLED","DISABLED").contains(state)) {
            throw new IllegalArgumentException("Invalid audit state");
        }
    }
    /** Local registration actions do not automatically become blockchain catalogue events. */
    public enum Action { REGISTRATION_SUBMITTED,REGISTRATION_VERIFIED,REGISTRATION_REJECTED,ADMIN_CHANGED,ADMIN_BOOTSTRAPPED }
    /** The immutable safe snapshot deliberately has no generic payload or note extension. */
    public record Snapshot(String previousState,String state,Long previousVersion,Long version,String origin) { }
}
