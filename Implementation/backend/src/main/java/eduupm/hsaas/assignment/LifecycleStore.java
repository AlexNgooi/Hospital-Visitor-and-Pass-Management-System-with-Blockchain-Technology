package eduupm.hsaas.assignment;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;
import org.springframework.jdbc.core.JdbcTemplate;
import eduupm.hsaas.card.CardRules;
import eduupm.hsaas.common.DatabaseTime;

/** M05 persistence owns cards/assignments/scans only; registration data is accessed through its root facet. */
final class LifecycleStore {
    // Source predicates apply equally to counts and items, independently of database CHECK enforcement.
    static final String CARD_SOURCE="((c.enrollment_method='SCAN' AND c.data_origin='SIMULATED') OR (c.enrollment_method='MANUAL' AND c.data_origin='SYNTHETIC'))";
    static final String ASSIGNMENT_SOURCE="((a.operation_origin='SIMULATED' AND a.data_origin='SIMULATED') OR (a.operation_origin='MANUAL' AND a.data_origin='SYNTHETIC'))";
    final JdbcTemplate jdbc;
    LifecycleStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    Device device(String id,boolean lock) {
        var rows=jdbc.query("SELECT * FROM reader_devices WHERE id=?"+(lock?" FOR UPDATE":""),
                (rs,n)->new Device(rs.getString("id"),rs.getLong("counter_id"),rs.getBoolean("active"),rs.getString("active_scan_job_id"),rs.getString("environment")),id);
        if(rows.isEmpty()) throw CardRules.unavailable(); return rows.getFirst();
    }
    Job job(String id,boolean lock) {
        var rows=jdbc.query("SELECT * FROM scan_jobs WHERE id=?"+(lock?" FOR UPDATE":""),(rs,n)->new Job(rs.getString("id"),rs.getString("device_id"),
                rs.getLong("actor_id"),rs.getString("owner_context_id"),rs.getLong("counter_id"),rs.getString("purpose"),rs.getString("target_ref"),
                rs.getBytes("nonce_digest"),rs.getBytes("lease_digest"),rs.getString("capability_key_version"),time(rs,"expires_at"),rs.getString("status"),rs.getString("environment")),id);
        if(rows.isEmpty()) throw CardRules.unavailable(); return rows.getFirst();
    }
    Evidence evidence(String id,boolean lock) {
        var rows=jdbc.query("SELECT * FROM scan_results WHERE id=?"+(lock?" FOR UPDATE":""),(rs,n)->new Evidence(rs.getString("id"),rs.getString("job_id"),
                rs.getString("normalized_uid"),rs.getString("profile_code"),rs.getString("category_code"),rs.getString("sample_code"),rs.getString("data_origin"),rs.getString("environment")),id);
        if(rows.isEmpty()) throw CardRules.unavailable(); return rows.getFirst();
    }
    Evidence resultForJob(String id) {
        var ids=jdbc.query("SELECT id FROM scan_results WHERE job_id=?",(rs,n)->rs.getString(1),id);
        return ids.isEmpty()?null:evidence(ids.getFirst(),false);
    }
    Card card(String id,boolean lock) {
        var rows=jdbc.query("SELECT * FROM cards WHERE id=?"+(lock?" FOR UPDATE":""),(rs,n)->cardRow(rs),id);
        if(rows.isEmpty()) throw CardRules.unavailable(); return rows.getFirst();
    }
    Card byUid(String uid) {
        var rows=jdbc.query("SELECT * FROM cards WHERE normalized_uid=?",(rs,n)->cardRow(rs),uid);
        return rows.isEmpty()?null:rows.getFirst();
    }
    private Card cardRow(ResultSet rs) throws SQLException {
        String method=rs.getString("enrollment_method"),origin=rs.getString("data_origin");
        if(!(("SCAN".equals(method) && "SIMULATED".equals(origin)) || ("MANUAL".equals(method) && "SYNTHETIC".equals(origin)))) throw CardRules.unavailable();
        return new Card(rs.getString("id"),rs.getString("normalized_uid"),rs.getString("card_code"),rs.getLong("category_id"),rs.getString("category_code"),
                rs.getString("profile_code"),rs.getString("status"),rs.getLong("version"),rs.getString("data_origin"),rs.getString("environment"));
    }
    Assignment assignment(String id,boolean lock) {
        var rows=jdbc.query("SELECT * FROM card_assignments WHERE id=?"+(lock?" FOR UPDATE":""),(rs,n)->assignmentRow(rs),id);
        if(rows.isEmpty()) throw CardRules.unavailable(); return rows.getFirst();
    }
    Assignment activeForCard(String card) {
        var rows=jdbc.query("SELECT * FROM card_assignments WHERE active_card_id=?",(rs,n)->assignmentRow(rs),card);
        return rows.isEmpty()?null:rows.getFirst();
    }
    private Assignment assignmentRow(ResultSet rs) throws SQLException {
        String method=rs.getString("operation_origin"),origin=rs.getString("data_origin");
        if(!(("SIMULATED".equals(method) && "SIMULATED".equals(origin)) || ("MANUAL".equals(method) && "SYNTHETIC".equals(origin)))) throw CardRules.unavailable();
        return new Assignment(rs.getString("id"),rs.getString("pass_reference"),rs.getString("card_id"),rs.getLong("registration_id"),
                rs.getLong("issue_counter_id"),rs.getLong("return_counter_id"),time(rs,"issued_at"),time(rs,"due_at"),
                rs.getString("return_rule_key"),rs.getLong("return_rule_version"),time(rs,"returned_at"),time(rs,"closed_at"),
                rs.getString("closure_reason"),rs.getLong("version"),rs.getString("operation_origin"),rs.getString("environment"),
                rs.getString("data_origin"),nullableId(rs,"destination_id"),rs.getString("destination_code"),rs.getString("destination_name"),
                nullableId(rs,"issued_by"),nullableId(rs,"returned_by"),nullableId(rs,"closed_by"));
    }
    static String nullableId(ResultSet rs,String name) throws SQLException { return rs.getObject(name)==null?null:Long.toString(rs.getLong(name)); }
    static Instant time(ResultSet rs,String name) throws SQLException { return DatabaseTime.instant(rs.getObject(name,LocalDateTime.class)); }
    static String uuid() { return java.util.UUID.randomUUID().toString(); }

    /** SQL bounded pages avoid unbounded inventory exports and expose only a safe UID suffix. */
    List<CardView> inventory(int page,String environment) {
        return jdbc.query("SELECT c.*,d.name AS destination_label FROM cards c LEFT JOIN destinations d ON d.id=c.destination_id WHERE c.environment=? AND "+CARD_SOURCE+" ORDER BY c.enrolled_at DESC,c.id DESC LIMIT 25 OFFSET ?",
                (rs,n)->cardView(rs),environment,page*25);
    }
    /** Reusable safe projection works for legacy unbound stock and new manually bound stock. */
    CardView cardView(ResultSet rs) throws SQLException {
        var card=cardRow(rs);
        return new CardView(card.id(),card.code(),card.uid()==null?null:"***"+card.uid().substring(Math.max(0,card.uid().length()-4)),
                card.category(),card.status(),card.version(),card.origin(),card.environment(),nullableId(rs,"destination_id"),
                rs.getString("destination_label"),rs.getString("enrollment_method"));
    }

    /** Staff reads are scoped to the same currently authorized issue/return counter; no raw visitor fields are selected. */
    List<AssignmentView> assignments(long counter,int page,boolean overdue,Instant now,String environment,Long registration) {
        var args=new ArrayList<Object>(List.of(counter,counter,environment));
        if(registration!=null) args.add(registration);
        if(overdue) args.add(DatabaseTime.sql(now));
        args.add(page*25);
        return jdbc.query("SELECT a.*,c.card_code,c.status AS card_status FROM card_assignments a JOIN cards c ON c.id=a.card_id "
                +"WHERE a.issue_counter_id=? AND a.return_counter_id=? AND a.environment=? AND c.environment=a.environment AND "+CARD_SOURCE+" AND "+ASSIGNMENT_SOURCE+" "
                +(registration==null?"":"AND a.registration_id=? ")+(overdue?"AND a.closed_at IS NULL AND a.due_at<=? ":"")
                +"ORDER BY a.issued_at DESC,a.id DESC LIMIT 25 OFFSET ?",(rs,n)->view(assignmentRow(rs),rs.getString("card_code"),rs.getString("card_status"),now),
                args.toArray());
    }
    static AssignmentView view(Assignment a,String cardCode,String cardStatus,Instant now) {
        String state=a.closed()!=null?("LOST".equals(a.closure())?"LOST":"RETURNED"):
                (a.due()!=null && !now.isBefore(a.due())?"OVERDUE":cardStatus);
        return new AssignmentView(a.id(),a.reference(),a.cardId(),cardCode,Long.toString(a.registration()),Long.toString(a.counter()),state,
                a.issued(),a.due(),a.ruleKey(),a.ruleVersion(),a.returned(),a.closed(),a.closure(),a.version(),a.origin(),a.environment(),
                a.dataSource(),a.destinationId(),a.destinationCode(),a.destinationLabel(),a.issuedBy(),a.returnedBy(),a.closedBy());
    }
    List<EventView> history(String card) {
        return jdbc.query("SELECT id,assignment_id,event_type,actor_id,occurred_at,reason_code FROM lifecycle_events WHERE card_id=? ORDER BY occurred_at DESC,id DESC LIMIT 100",
                (rs,n)->new EventView(rs.getString(1),rs.getString(2),rs.getString(3),rs.getObject(4)==null?"SYSTEM":Long.toString(rs.getLong(4)),time(rs,"occurred_at"),rs.getString(6)),card);
    }
    record Device(String id,long counter,boolean active,String activeJob,String environment) { }
    record Job(String id,String device,long actor,String owner,long counter,String purpose,String target,byte[] nonceDigest,byte[] leaseDigest,
            String keyVersion,Instant expires,String status,String environment) { @Override public String toString() { return "Job[REDACTED]"; } }
    record Evidence(String id,String job,String uid,String profile,String category,String sample,String origin,String environment) {
        @Override public String toString() { return "Evidence[REDACTED]"; }
    }
    record Card(String id,String uid,String code,long categoryId,String category,String profile,String status,long version,String origin,String environment) {
        @Override public String toString() { return "Card[UID=REDACTED]"; }
    }
    record Assignment(String id,String reference,String cardId,long registration,long counter,long returnCounter,Instant issued,Instant due,String ruleKey,
            long ruleVersion,Instant returned,Instant closed,String closure,long version,String origin,String environment,
            String dataSource,String destinationId,String destinationCode,String destinationLabel,String issuedBy,String returnedBy,String closedBy) { }
    public record CardView(String id,String cardCode,String maskedUid,String categoryCode,String status,long version,String source,String environment,
            String destinationId,String destinationLabel,String enrollmentMethod) { }
    public record AssignmentView(String id,String passReference,String cardId,String cardCode,String registrationId,String counterId,String status,
            Instant issuedAt,Instant dueAt,String returnRuleKey,long returnRuleVersion,Instant returnedAt,Instant closedAt,String closureReason,
            long version,String operationOrigin,String environment,String dataSource,String destinationId,String destinationCode,String destinationLabel,
            String issuedBy,String returnedBy,String closedBy) { }
    public record EventView(String id,String assignmentId,String eventType,String actorId,Instant occurredAt,String reasonCode) { }
    public record Page<T>(int page,int pageSize,long total,List<T> items,Instant serverNow) { }
    public record JobView(String id,String deviceId,String counterId,String purpose,String targetId,String status,Instant expiresAt,
            String nonce,String leaseToken,String scanResultId,String sampleCode,String source,Instant serverNow) {
        @Override public String toString() { return "JobView[CAPABILITY=REDACTED]"; }
    }
}
