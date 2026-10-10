package eduupm.hsaas.registration;

import java.sql.*;
import java.time.*;
import java.time.format.DateTimeFormatterBuilder;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.auth.Accounts;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.*;
import eduupm.hsaas.common.IdempotencyPort.SafeResult;
import eduupm.hsaas.registrationentry.QrEntryService.GrantAccess;

/** The only persisted registration root: M04 commands use its write/read facets, never a second entity or SQL adapter. */
public final class RegistrationStore implements RegistrationReviewPort, RegistrationReadPort {
    private static final java.time.format.DateTimeFormatter TIME = new DateTimeFormatterBuilder().appendInstant(6).toFormatter();
    private static final String ROW = "SELECT r.*,d.name AS destination_label FROM visitor_registrations r JOIN destinations d ON d.id=r.destination_id ";
    private static final String SCOPED = ROW + "JOIN user_counter_permissions p ON p.counter_id=r.counter_id AND p.user_id=? AND p.active=TRUE "
            + "JOIN users u ON u.id=p.user_id AND u.active=TRUE AND u.role='COUNTER_STAFF' "
            + "JOIN counters c ON c.id=r.counter_id AND c.active=TRUE WHERE r.counter_id=? ";
    private final JdbcTemplate jdbc;
    private final JsonMapper json;
    private final Clock clock;
    private final Accounts accounts;
    private final SessionCapabilities capabilities;

    public RegistrationStore(JdbcTemplate jdbc, JsonMapper json, Clock clock, Accounts accounts, SessionCapabilities capabilities) {
        this.jdbc = jdbc; this.json = json; this.clock = clock; this.accounts = accounts; this.capabilities = capabilities;
    }

    /** The already-locked grant supplies all counter/environment authority; form data is an approved normalized whitelist. */
    long create(GrantAccess access, String anonymousScope, Category category, Destination destination,
            Map<String, String> form, String mode, String feedback) {
        assertGrantReceipt(access);
        boolean penjaga = category.code().equals("PENJAGA");
        String sql = "INSERT INTO visitor_registrations(public_reference,entry_grant_id,anonymous_scope_id,counter_id,category_id,category_code,"
                + "destination_id,field_schema_version,form_data,environment,data_origin,status,version,mrn_mode,mrn_feedback,mrn_verified,ward_verified,submitted_at)"
                + " VALUES(?,?,?,?,?,?,?,?,?,?,'SYNTHETIC','SUBMITTED',0,?,?,?,?,?)";
        Object[] values = { PublicReferences.next(), access.grantId(), anonymousScope, id(access.scope().counterId()), category.id(),
                category.code(), destination.id(), RegistrationFields.VERSION, json.writeValueAsString(form), access.scope().environment(),
                penjaga ? mode : null, penjaga ? feedback : null, penjaga ? false : null, penjaga ? false : null, DatabaseTime.sql(clock.instant()) };
        var key = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            for (int index = 0; index < values.length; index++) { statement.setObject(index + 1, values[index]); }
            return statement;
        }, key);
        if (key.getKey() == null) { throw new IllegalStateException("Registration ID was not produced"); }
        return key.getKey().longValue();
    }

    /** Acknowledgement joins creation/consumption/audit/idempotency; there is no disabled sending consent row. */
    void acknowledge(long registrationId) {
        RegistrationReadPort.ReadScope.requireTransaction();
        jdbc.update("INSERT INTO registration_consents(registration_id,purpose,granted,policy_version,captured_at) VALUES(?,'PRIVACY_ACK',TRUE,?,?)",
                registrationId, RegistrationFields.PRIVACY_VERSION, DatabaseTime.sql(clock.instant()));
    }
    String reference(long registrationId) {
        RegistrationReadPort.ReadScope.requireTransaction();
        return jdbc.queryForObject("SELECT public_reference FROM visitor_registrations WHERE id=?", String.class, registrationId);
    }

    /** Current active reference data is checked only for new submissions, not for old successful replays/history reads. */
    Category category(String code, String restriction) {
        var rows = jdbc.query("SELECT id,code,name FROM visitor_categories WHERE code=? AND active=TRUE FOR SHARE",
                (rs, n) -> new Category(rs.getLong("id"), rs.getString("code"), rs.getString("name")), code);
        if (rows.isEmpty() || !RegistrationFields.CATEGORIES.contains(rows.getFirst().code())
                || restriction != null && !restriction.equals(Long.toString(rows.getFirst().id()))) { throw RegistrationFields.invalid("categoryCode"); }
        return rows.getFirst();
    }
    Destination destination(String code, String field) {
        if (!RegistrationFields.selectableCode(code)) { throw RegistrationFields.invalid(field); }
        var rows = jdbc.query("SELECT id,code,name FROM destinations WHERE code=? AND active=TRUE FOR SHARE",
                (rs, n) -> new Destination(rs.getLong("id"), rs.getString("code"), rs.getString("name")), code);
        if (rows.isEmpty() || !RegistrationFields.selectableCode(rows.getFirst().code())) { throw RegistrationFields.invalid(field); }
        return rows.getFirst();
    }
    List<Category> categories(String restriction) {
        return jdbc.query("SELECT id,code,name FROM visitor_categories WHERE active=TRUE ORDER BY id",
                (rs, n) -> new Category(rs.getLong("id"), rs.getString("code"), rs.getString("name"))).stream()
                .filter(value -> RegistrationFields.CATEGORIES.contains(value.code()) && (restriction == null || restriction.equals(Long.toString(value.id())))).toList();
    }
    List<Destination> destinations() {
        return jdbc.query("SELECT id,code,name FROM destinations WHERE active=TRUE ORDER BY id",
                (rs, n) -> new Destination(rs.getLong("id"), rs.getString("code"), rs.getString("name"))).stream()
                .filter(value -> RegistrationFields.selectableCode(value.code())).toList();
    }

    /** Internal non-locking discovery cannot authorize reads or distinguish a hidden object's state. */
    @Override public ReviewCoordinates discover(String registrationId) {
        var rows = jdbc.query("SELECT id,counter_id FROM visitor_registrations WHERE id=?",
                (rs, n) -> new ReviewCoordinates(Long.toString(rs.getLong(1)), Long.toString(rs.getLong(2))), id(registrationId));
        if (rows.isEmpty()) { throw notFound(); } return rows.getFirst();
    }

    /** Allows terminal states for the caller's second replay check; only recordDecision enforces SUBMITTED/version. */
    @Override public LockedRegistration lock(ReviewCoordinates coordinates) {
        RegistrationReadPort.ReadScope.requireTransaction();
        // Lock only the registration root; a joined FOR UPDATE would also lock destination rows out of order.
        var rows = jdbc.query("SELECT id,counter_id,category_code,status,version,environment FROM visitor_registrations WHERE id=? FOR UPDATE",
                (rs, n) -> new LockedProjection(rs.getLong("id"), rs.getLong("counter_id"), rs.getString("category_code"),
                        rs.getString("status"), rs.getLong("version"), rs.getString("environment")), id(coordinates.id()));
        if (rows.isEmpty()) { throw notFound(); }
        var value = rows.getFirst();
        if (!coordinates.counterId().equals(Long.toString(value.counter()))) { throw new ApiFailure(409, "VERSION_CONFLICT", "Registration coordinates changed."); }
        return LockedRegistration.capture(coordinates, value.category(), value.status(), value.version(), value.environment());
    }

    /** Exact receipt rejection occurs before ANY SQL; actor/time/source cannot be supplied in an HTTP decision. */
    @Override public SafeResult recordDecision(LockedRegistration receipt, long expectedVersion, String owner, Decision decision) {
        if (receipt == null) { throw new IllegalStateException("Lock the registration before recording a decision"); }
        receipt.consumeReceipt();
        var rows = jdbc.query(ROW + "WHERE r.id=?", this::row, id(receipt.coordinates().id()));
        if (rows.isEmpty()) { throw notFound(); }
        var value = rows.getFirst();
        if (!receipt.coordinates().counterId().equals(Long.toString(value.counter()))) { throw notFound(); }
        // The caller already holds the complete prefix. These are current projections, not late reverse-order locks.
        var actors = jdbc.query("SELECT a.actor_id,u.role,u.active FROM auth_session_contexts a JOIN users u ON u.id=a.actor_id "
                        + "JOIN app_session_bindings b ON b.id=a.binding_id WHERE a.id=? AND a.state='ACTIVE' "
                        + "AND b.current_owner_context_id=a.id AND b.generation=a.generation AND b.invalidated_at IS NULL "
                        + "AND a.captured_security_epoch=u.security_epoch AND a.absolute_expires_at>? AND a.confirmed_idle_expires_at>?",
                (rs, n) -> new Actor(rs.getLong(1), rs.getString(2), rs.getBoolean(3)), owner, DatabaseTime.sql(clock.instant()), DatabaseTime.sql(clock.instant()));
        if (actors.isEmpty() || !actors.getFirst().active()) { throw ApiFailure.unauthenticated(); }
        Actor actor = actors.getFirst();
        if (!actor.role().equals("COUNTER_STAFF")) { throw new ApiFailure(403, "ACCESS_DENIED", "Counter Staff access is required."); }
        if (jdbc.queryForObject("SELECT COUNT(*) FROM user_counter_permissions p JOIN counters c ON c.id=p.counter_id "
                + "WHERE p.user_id=? AND p.counter_id=? AND p.active=TRUE AND c.active=TRUE", Integer.class, actor.id(), value.counter()) != 1) { throw notFound(); }
        if (!value.source().equals("SYNTHETIC") || !Set.of("development", "synthetic", "test").contains(value.environment())) { throw new ApiFailure(409, "INTEGRATION_DISABLED", "Only synthetic review is enabled."); }
        var change = RegistrationDecisions.apply(value.category(), value.status(), value.version(), expectedVersion, decision);
        boolean verify = change.status().equals("VERIFIED"), penjaga = value.category().equals("PENJAGA");
        String evidence = verify ? json.writeValueAsString(new ManualEvidence(change.methodCode(), change.basisCodes())) : null;
        int updated = jdbc.update("UPDATE visitor_registrations SET status=?,version=?,reviewer_id=?,reviewed_at=?,review_source=?,review_evidence=?,reject_reason=?,"
                        + "mrn_verified=?,ward_verified=? WHERE id=? AND status='SUBMITTED' AND version=?",
                change.status(), change.version(), actor.id(), DatabaseTime.sql(clock.instant()), change.source(), evidence, change.reasonCode(),
                penjaga ? verify : null, penjaga ? verify : null, value.id(), expectedVersion);
        if (updated != 1) { throw new ApiFailure(409, "VERSION_CONFLICT", "Registration changed. Refresh before reviewing."); }
        return new SafeResult(Long.toString(value.id()), value.reference(), change.status(), change.version());
    }

    /** The factory is independently guarded and safely re-enters only M04's exact already-held account/counter prefix. */
    @Override public ReadScope captureReadScope(String owner, String counterId) {
        ReadScope.requireTransaction();
        long counter = id(counterId);
        var actors = jdbc.query("SELECT actor_id FROM auth_session_contexts WHERE id=?", (rs, n) -> rs.getLong(1), owner);
        if (actors.isEmpty()) { throw ApiFailure.unauthenticated(); }
        var actor = accounts.lock(actors.getFirst());
        if (!actor.active()) { throw ApiFailure.unauthenticated(); }
        if (!actor.role().equals("COUNTER_STAFF")) { throw new ApiFailure(403, "ACCESS_DENIED", "Counter Staff access is required."); }
        try { capabilities.lockOwners(List.of(new SessionCapabilities.OwnerUse(owner, counter)), null); }
        catch (ApiFailure denied) { if (denied.status() == 410) { throw notFound(); } throw denied; }
        return ReadScope.capture(owner, actor.id(), counterId);
    }

    /** Permission joins and the bound single counter are part of both count and items SQL; inactive destinations remain historical labels. */
    @Override public QueuePage readMaskedQueue(ReadScope scope, ReadQuery query) {
        if (scope == null) { throw new IllegalStateException("Capture the read scope before querying"); }
        scope.consume();
        var parameters = new ArrayList<Object>(List.of(scope.actorId(), id(scope.counterId())));
        String conditions = "";
        if (query.category() != null) { conditions += " AND r.category_code=?"; parameters.add(query.category()); }
        if (query.status() != null) { conditions += " AND r.status=?"; parameters.add(query.status()); }
        String querySql = SCOPED + conditions;
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM (" + querySql + ") matched", Long.class, parameters.toArray());
        parameters.add(query.pageSize()); parameters.add((long) query.page() * query.pageSize());
        var items = jdbc.query(querySql + " ORDER BY r.submitted_at DESC,r.id DESC LIMIT ? OFFSET ?", this::row, parameters.toArray())
                .stream().map(this::item).toList();
        return new QueuePage(items, total == null ? 0 : total, query.page(), query.pageSize(), TIME.format(clock.instant()));
    }
    @Override public Detail readMaskedDetail(ReadScope scope, String registrationId) {
        if (scope == null) { throw new IllegalStateException("Capture the read scope before querying"); }
        scope.consume();
        var rows = jdbc.query(SCOPED + " AND r.id=?", this::row, scope.actorId(), id(scope.counterId()), id(registrationId));
        if (rows.isEmpty()) { throw notFound(); }
        var value = rows.getFirst(); var base = item(value); boolean penjaga = value.category().equals("PENJAGA");
        return new Detail(base.id(), base.publicReference(), base.counterId(), base.categoryCode(), base.maskedVisitorName(), base.destinationLabel(),
                base.status(), base.version(), base.submittedAt(), RegistrationMasking.identification(text(value.form(), "identificationNumber")),
                RegistrationMasking.phone(text(value.form(), "phone")), penjaga ? RegistrationMasking.identification(text(value.form(), "mrn")) : null,
                penjaga ? allowed(value.mode(), Set.of("mock", "manual")) : null,
                penjaga ? allowed(value.feedback(), Set.of("NOT_CHECKED", "MATCH", "NO_MATCH", "TIMEOUT", "UNAVAILABLE")) : null,
                allowed(value.environment(), Set.of("development", "synthetic", "test")), allowed(value.source(), Set.of("SYNTHETIC")), metadata(value));
    }

    private QueueItem item(RootRow value) {
        return new QueueItem(Long.toString(value.id()), value.reference(), Long.toString(value.counter()), allowed(value.category(), RegistrationFields.CATEGORIES),
                RegistrationMasking.name(text(value.form(), "fullName")), RegistrationMasking.destination(value.destination()),
                allowed(value.status(), Set.of("SUBMITTED", "VERIFIED", "REJECTED", "CANCELLED")), RegistrationVersions.checked(value.version()), TIME.format(value.submitted()));
    }
    private ReviewMetadata metadata(RootRow value) {
        if (value.reviewer() == null) { return null; }
        boolean verify = value.status().equals("VERIFIED");
        List<String> bases = verify ? value.evidence().path("basisCodes").valueStream().map(JsonNode::asString).toList() : List.of();
        String method = verify ? value.evidence().path("methodCode").asString() : null;
        if (verify) { SyntheticReviewRules.verify(value.category().equals("PENJAGA"), true,
                value.category().equals("PENJAGA") ? true : null, value.category().equals("PENJAGA") ? true : null, new ManualEvidence(method, bases)); }
        String reason = verify ? null : allowed(value.reason(), Set.of("INFORMATION_INCOMPLETE", "IDENTITY_NOT_CONFIRMED", "MRN_WARD_NOT_CONFIRMED", "INFORMATION_NOT_CONFIRMED"));
        return new ReviewMetadata(Long.toString(value.reviewer()), TIME.format(value.reviewed()),
                allowed(value.reviewSource(), Set.of("SYNTHETIC_MANUAL", "LOCAL")), method, bases, reason);
    }
    private RootRow row(ResultSet rs, int n) throws SQLException {
        long reviewer = rs.getLong("reviewer_id"); Long actor = rs.wasNull() ? null : reviewer;
        String evidence = rs.getString("review_evidence");
        return new RootRow(rs.getLong("id"), rs.getString("public_reference"), rs.getLong("counter_id"), rs.getString("category_code"),
                rs.getString("status"), rs.getLong("version"), rs.getString("environment"), rs.getString("data_origin"),
                rs.getString("destination_label"), json.readTree(rs.getString("form_data")), rs.getString("mrn_mode"), rs.getString("mrn_feedback"),
                instant(rs, "submitted_at"), actor, instant(rs, "reviewed_at"), rs.getString("review_source"),
                evidence == null ? null : json.readTree(evidence), rs.getString("reject_reason"));
    }
    private Instant instant(ResultSet rs, String field) throws SQLException { return DatabaseTime.instant(rs.getObject(field, LocalDateTime.class)); }
    /** Validate without spending M02's receipt; final consumption remains after parent/ack insertion in this exact transaction. */
    static void assertGrantReceipt(GrantAccess access) {
        ReadScope.requireTransaction();
        Object marker = access == null ? null : org.springframework.transaction.support.TransactionSynchronizationManager.getResource(access);
        if (!(marker instanceof org.springframework.transaction.support.TransactionSynchronization)
                || org.springframework.transaction.support.TransactionSynchronizationManager.getSynchronizations().stream().noneMatch(value -> value == marker)) {
            throw new IllegalStateException("Lock this grant in the current transaction before creating a registration");
        }
    }
    private String text(JsonNode form, String field) { return form.path(field).isString() ? form.path(field).asString() : ""; }
    private String allowed(String value, Set<String> options) { if (value == null || !options.contains(value)) { throw new IllegalStateException("Invalid internal registration projection"); } return value; }
    private long id(String value) {
        try { if (value == null || !value.matches("[1-9][0-9]{0,18}")) { throw new IllegalArgumentException(); } return Long.parseLong(value); }
        catch (RuntimeException failure) { throw notFound(); }
    }
    private ApiFailure notFound() { return new ApiFailure(404, "NOT_FOUND", "This registration is not available."); }
    /** Public metadata does not include form/contact data. */
    public record Category(long id, String code, String label) { }
    public record Destination(long id, String code, String label) { }
    private record Actor(long id, String role, boolean active) { }
    private record LockedProjection(long id, long counter, String category, String status, long version, String environment) { }
    /** Internal persistence projection is never serialized or formatted as a diagnostic. */
    private record RootRow(long id, String reference, long counter, String category, String status, long version, String environment,
            String source, String destination, JsonNode form, String mode, String feedback, Instant submitted,
            Long reviewer, Instant reviewed, String reviewSource, JsonNode evidence, String reason) {
        @Override public String toString() { return "RootRow[REDACTED]"; }
    }
}
