package eduupm.hsaas.registration;

import java.security.*;
import java.time.*;
import java.time.format.DateTimeFormatterBuilder;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.*;
import eduupm.hsaas.common.RestartDetails.FormContext;
import eduupm.hsaas.config.FoundationProperties;
import eduupm.hsaas.hospital.HospitalVerificationPort;
import eduupm.hsaas.registrationentry.QrEntryService;

/** Orchestrates anonymous schema/feedback/submission; no hospital/provider call or framework save occurs inside domain locks. */
public final class RegistrationService {
    private static final java.time.format.DateTimeFormatter TIME = new DateTimeFormatterBuilder().appendInstant(6).toFormatter();
    private final JdbcTemplate jdbc;
    private final JsonMapper json;
    private final Clock clock;
    private final TransactionTemplate tx;
    private final QrEntryService entries;
    private final SessionCapabilities capabilities;
    private final RegistrationStore store;
    private final LocalAuditPort audit;
    private final IdempotencyPort commands;
    private final FoundationProperties properties;
    private final HospitalVerificationPort hospital;
    private final SecureRandom random = new SecureRandom();

    public RegistrationService(JdbcTemplate jdbc, JsonMapper json, Clock clock, TransactionTemplate tx, QrEntryService entries,
            SessionCapabilities capabilities, RegistrationStore store, LocalAuditPort audit, IdempotencyPort commands,
            FoundationProperties properties, HospitalVerificationPort hospital) {
        this.jdbc = jdbc; this.json = json; this.clock = clock; this.tx = tx; this.entries = entries;
        this.capabilities = capabilities; this.store = store; this.audit = audit; this.commands = commands;
        this.properties = properties; this.hospital = hospital;
    }

    /** Public metadata is bound to the originally accepted form; bootstrap alone never grants schema authority. */
    public SchemaReply schema(String binding, String body) {
        entries.anonymous(binding);
        var input = RegistrationPayload.request(json, body, Set.of("formContext"));
        var context = RegistrationPayload.context(input.path("formContext"));
        return tx.execute(status -> {
            var access = entries.lockGrant(binding, context);
            var categories = store.categories(access.scope().categoryScope()).stream()
                    .map(category -> new CategorySchema(Long.toString(category.id()), category.code(), RegistrationMasking.destination(category.label()),
                            RegistrationFields.fields(category.code()))).toList();
            if (categories.isEmpty()) { throw RegistrationFields.invalid("categoryCode"); }
            var destinations = store.destinations().stream()
                    .map(destination -> new DestinationOption(destination.code(), RegistrationMasking.destination(destination.label()))).toList();
            return new SchemaReply(context, RegistrationFields.VERSION, "SYNTHETIC", "NOT_ENABLED",
                    new PrivacyPolicy(RegistrationFields.PRIVACY_VERSION, RegistrationFields.PRIVACY_TEXT), categories, destinations);
        });
    }

    /** Adapter execution is between short transactions; the second grant check rejects replacement/revoke/expiry during that call. */
    public FeedbackReply validateMrn(String binding, String body) {
        var anonymous = entries.anonymous(binding);
        var input = RegistrationPayload.request(json, body, Set.of("formContext", "mrn", "wardCode"));
        var context = RegistrationPayload.context(input.path("formContext"));
        String mrn = RegistrationFields.normalized(RegistrationPayload.text(input.path("mrn"), "mrn", 100), 25, "mrn");
        if (!mrn.matches("DEMO-MRN-[A-Z0-9]{4,16}")) { throw RegistrationFields.invalid("mrn"); }
        String ward = RegistrationFields.normalized(RegistrationPayload.text(input.path("wardCode"), "wardCode", 100), 32, "wardCode");
        tx.executeWithoutResult(status -> {
            var access = entries.lockGrant(binding, context);
            store.category("PENJAGA", access.scope().categoryScope()); store.destination(ward, "wardCode");
        });
        var outcome = hospital.verify(mrn, ward);
        return tx.execute(status -> {
            var access = entries.lockGrant(binding, context);
            store.category("PENJAGA", access.scope().categoryScope());
            var destination = store.destination(ward, "wardCode");
            if (properties.mrnMode().equals("manual")) {
                return new FeedbackReply(outcome.name(), "manual", "SYNTHETIC", null, null);
            }
            byte[] bytes = new byte[32]; random.nextBytes(bytes);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            Instant now = clock.instant(), expires = now.plusSeconds(300), deadline = grantDeadline(access);
            if (deadline.isBefore(expires)) { expires = deadline; }
            byte[] fingerprint = fingerprint(anonymous.scope(), context, mrn, destination.code(), properties.hashKeyVersion());
            jdbc.update("INSERT INTO mrn_validation_records(token_digest,anonymous_scope_id,grant_id,binding_version,mrn_fingerprint,"
                            + "fingerprint_key_version,ward_id,mode,adapter_version,outcome,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
                    digest(token), anonymous.scope(), access.grantId(), context.bindingVersion(), fingerprint, properties.hashKeyVersion(),
                    destination.id(), properties.mrnMode(), hospital.version(), outcome.name(), DatabaseTime.sql(now), DatabaseTime.sql(expires));
            return new FeedbackReply(outcome.name(), properties.mrnMode(), "SYNTHETIC", token, TIME.format(expires));
        });
    }

    /** Successful replay uses its own anonymous guard transaction, releasing later binding locks before a new QR prefix. */
    public Receipt submit(String binding, String key, String body) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) { throw new IllegalStateException("Begin submission outside a domain transaction"); }
        var anonymous = entries.anonymous(binding);
        var parsed = RegistrationPayload.submission(json, body);
        var scope = new RequestEncoding.Scope(RequestEncoding.Kind.ANONYMOUS, anonymous.scope());
        var namespace = new IdempotencyPort.Namespace(scope, "SUBMIT", "REGISTER", IdempotencyPort.key(key));
        byte[] encoding = RegistrationPayload.encode(json, scope, parsed);
        var previous = replay(binding, namespace, encoding);
        if (previous.isPresent()) { return previous.get(); }
        try {
            return tx.execute(status -> {
                var access = entries.lockGrant(binding, parsed.context());
                // A winner may have committed while the complete grant/security prefix was acquired.
                var winner = commands.replay(namespace, encoding);
                if (winner.isPresent()) { return new Receipt(winner.get().result().reference()); }
                if (!RegistrationFields.VERSION.equals(parsed.schemaVersion())) {
                    throw new ApiFailure(409, "FIELD_SCHEMA_VERSION_CONFLICT", "Reload the current registration form.");
                }
                var form = RegistrationFields.validate(parsed.category(), parsed.input().path("formData"));
                var category = store.category(parsed.category(), access.scope().categoryScope());
                boolean penjaga = category.code().equals("PENJAGA");
                String destinationField = penjaga ? "wardCode" : "destinationCode";
                var destination = store.destination(form.get(destinationField), "formData." + destinationField);
                var privacy = parsed.input().path("privacyAcknowledgement");
                if (!privacy.path("acknowledged").isBoolean() || !privacy.path("acknowledged").asBoolean()) {
                    throw RegistrationFields.invalid("privacyAcknowledgement");
                }
                if (!RegistrationFields.PRIVACY_VERSION.equals(privacy.path("policyVersion").asString())) {
                    throw new ApiFailure(409, "PRIVACY_POLICY_CHANGED", "Read the current privacy acknowledgement.");
                }
                if (!penjaga && parsed.input().has("mrnValidationToken")) { throw RegistrationFields.invalid("mrnValidationToken"); }
                String feedback = penjaga ? feedback(parsed, access, anonymous.scope(), form, destination) : null;
                long registration = store.create(access, anonymous.scope(), category, destination, form, properties.mrnMode(), feedback);
                store.acknowledge(registration);
                entries.consume(access, registration);
                String reference = store.reference(registration);
                audit.append(LocalAuditPort.Action.REGISTRATION_SUBMITTED, "REGISTRATION", Long.toString(registration), null,
                        new LocalAuditPort.Snapshot(null, "SUBMITTED", null, 0L, "LOCAL"));
                commands.success(namespace, encoding, 201, new IdempotencyPort.SafeResult(Long.toString(registration), reference, "SUBMITTED", 0));
                return new Receipt(reference);
            });
        } catch (DuplicateKeyException conflict) {
            // Never swallow a rollback-only unique conflict and continue mutation; inspect only under fresh authority.
            return replay(binding, namespace, encoding).orElseThrow(() -> new ApiFailure(409, "IDEMPOTENCY_CONFLICT", "Check the original submission before retrying."));
        } catch (ApiFailure failure) {
            if (!Set.of("REGISTRATION_ENTRY_REQUIRED", "REGISTRATION_ENTRY_USED", "REGISTRATION_ENTRY_CONTEXT_CHANGED",
                    "REGISTRATION_ENTRY_EXPIRED", "REGISTRATION_ENTRY_REVOKED").contains(failure.code())) { throw failure; }
            var winner = replay(binding, namespace, encoding);
            if (winner.isPresent()) { return winner.get(); }
            // Another key cannot consume a submitted grant. Lookup is scoped and reveals no registration data.
            Integer consumed = jdbc.queryForObject("SELECT COUNT(*) FROM registration_entry_grants WHERE grant_reference=? AND anonymous_scope_id=? AND consumed_at IS NOT NULL",
                    Integer.class, parsed.context().grantReference(), anonymous.scope());
            if (consumed != null && consumed > 0) { throw new ApiFailure(409, "REGISTRATION_ENTRY_USED", "Registration was already submitted."); }
            throw failure;
        }
    }

    private Optional<Receipt> replay(String binding, IdempotencyPort.Namespace namespace, byte[] encoding) {
        return tx.execute(status -> {
            var current = capabilities.anonymous(binding);
            if (!namespace.scope().id().equals(current.scope())) { throw ApiFailure.unauthenticated(); }
            return commands.replay(namespace, encoding).map(result -> new Receipt(result.result().reference()));
        });
    }

    /** A changed MRN/ward/context/mode or expired feedback cannot be carried into a new registration. */
    private String feedback(RegistrationPayload.Parsed parsed, QrEntryService.GrantAccess access, String scope,
            Map<String, String> form, RegistrationStore.Destination ward) {
        var token = parsed.input().path("mrnValidationToken");
        if (token.isMissingNode() || token.isNull()) { return "NOT_CHECKED"; }
        if (!token.isString() || !token.asString().matches("[A-Za-z0-9_-]{43}")) { throw RegistrationFields.invalid("mrnValidationToken"); }
        var rows = jdbc.query("SELECT * FROM mrn_validation_records WHERE token_digest=? FOR UPDATE",
                (rs, n) -> new FeedbackRecord(rs.getString("anonymous_scope_id"), rs.getString("grant_id"), rs.getLong("binding_version"),
                        rs.getBytes("mrn_fingerprint"), rs.getString("fingerprint_key_version"), rs.getLong("ward_id"), rs.getString("mode"),
                        rs.getString("adapter_version"), rs.getString("outcome"), DatabaseTime.instant(rs.getObject("expires_at", LocalDateTime.class))), digest(token.asString()));
        if (rows.isEmpty()) { throw RegistrationFields.invalid("mrnValidationToken"); }
        var value = rows.getFirst();
        if (!clock.instant().isBefore(value.expires())) { throw new ApiFailure(409, "MRN_VALIDATION_EXPIRED", "Repeat the demo check or continue for manual review."); }
        if (!value.scope().equals(scope) || !value.grant().equals(access.grantId()) || value.version() != parsed.context().bindingVersion()
                || value.ward() != ward.id() || !value.mode().equals(properties.mrnMode()) || !value.adapter().equals(hospital.version())
                || !MessageDigest.isEqual(value.fingerprint(), fingerprint(scope, parsed.context(), form.get("mrn"), ward.code(), value.keyVersion()))) {
            throw new ApiFailure(409, "MRN_VALIDATION_CHANGED", "Repeat the demo check or continue for manual review.");
        }
        return value.outcome();
    }
    private byte[] fingerprint(String anonymous, FormContext context, String mrn, String ward, String keyVersion) {
        byte[] encoding = RequestEncoding.encode(json, new RequestEncoding.Scope(RequestEncoding.Kind.ANONYMOUS, anonymous),
                "MRN_FEEDBACK", context.grantReference(), 1, List.of(RequestEncoding.Field.object("formContext", List.of(
                        RequestEncoding.Field.text("grantReference", context.grantReference()), RequestEncoding.Field.integer("bindingVersion", context.bindingVersion()))),
                        RequestEncoding.Field.text("mrn", mrn), RequestEncoding.Field.text("wardCode", ward),
                        RequestEncoding.Field.text("mode", properties.mrnMode()), RequestEncoding.Field.text("adapterVersion", hospital.version())));
        return commands.hash(encoding, keyVersion);
    }
    private Instant grantDeadline(QrEntryService.GrantAccess access) {
        return jdbc.queryForObject("SELECT expires_at FROM registration_entry_grants WHERE id=?",
                (rs, n) -> DatabaseTime.instant(rs.getObject(1, LocalDateTime.class)), access.grantId());
    }
    private byte[] digest(String value) {
        try { return MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException("SHA-256 is unavailable"); }
    }
    /** Cleanup touches only expired temporary feedback and never registration/consent/audit history or an external queue. */
    public int cleanupFeedback() { return jdbc.update("DELETE FROM mrn_validation_records WHERE expires_at<=? ORDER BY expires_at,id LIMIT 500", DatabaseTime.sql(clock.instant())); }
    public record Receipt(String publicReference) { }
    /** Feedback is serializable for its owner but its capability must never appear in diagnostic formatting. */
    public record FeedbackReply(String feedback, String mode, String source, String validationToken, String expiresAt) {
        @Override public String toString() { return "FeedbackReply[redacted]"; }
    }
    public record PrivacyPolicy(String policyVersion, String text) { }
    public record CategorySchema(String id, String code, String label, List<RegistrationFields.FieldSpec> fields) { }
    public record DestinationOption(String code, String label) { }
    public record SchemaReply(FormContext formContext, String fieldSchemaVersion, String source, String notificationStatus,
            PrivacyPolicy privacy, List<CategorySchema> categories, List<DestinationOption> destinations) { }
    private record FeedbackRecord(String scope, String grant, long version, byte[] fingerprint, String keyVersion, long ward,
            String mode, String adapter, String outcome, Instant expires) {
        @Override public String toString() { return "FeedbackRecord[REDACTED]"; }
    }
}
