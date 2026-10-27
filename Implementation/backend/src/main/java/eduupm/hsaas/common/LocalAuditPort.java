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
        // M05/M06 targets remain generated identifiers; a label, contact value or setting body cannot become an audit target.
        if(!Set.of("USER","COUNTER","REGISTRATION","CATEGORY","DESTINATION","BOOTSTRAP",
                "CARD","ASSIGNMENT","SCAN","SETTING","REPORT_EXPORT").contains(targetKind)
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
        // Extend the finite vocabulary for local simulation and administration without accepting arbitrary payload fields.
        if(state!=null && !Set.of("SUBMITTED","VERIFIED","REJECTED","CANCELLED","ACTIVE","INACTIVE","BOOTSTRAPPED","ENABLED","DISABLED",
                "AVAILABLE","ISSUED","RETURNED","OVERDUE","LOST","RESTORED","CLAIMED","SUCCEEDED","CONSUMED","EXPIRED",
                "CONTACT_REVEALED","FOLLOWUP_RECORDED","EXPORTED").contains(state)) {
            throw new IllegalArgumentException("Invalid audit state");
        }
    }
    /** These local actions never enqueue notification or blockchain work while those integrations are disabled. */
    public enum Action {
        REGISTRATION_SUBMITTED,REGISTRATION_VERIFIED,REGISTRATION_REJECTED,ADMIN_CHANGED,ADMIN_BOOTSTRAPPED,
        CARD_REGISTERED,ISSUED,RETURNED,OVERDUE,MARKED_LOST,DISABLED,RESTORED,
        CONTACT_REVEALED,FOLLOWUP_RECORDED,REPORT_EXPORTED
        // R01 explicit staff comparison is audited without storing any revealed field in this event.
        ,REGISTRATION_REVIEW_FIELDS_VIEWED
    }
    /** The immutable safe snapshot deliberately has no generic payload or note extension. */
    public record Snapshot(String previousState,String state,Long previousVersion,Long version,String origin) { }
}
