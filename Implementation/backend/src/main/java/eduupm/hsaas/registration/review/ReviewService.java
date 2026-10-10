package eduupm.hsaas.registration.review;

import java.util.List;
import java.util.Objects;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.auth.Accounts;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.common.IdempotencyPort;
import eduupm.hsaas.common.LocalAuditPort;
import eduupm.hsaas.common.RequestEncoding;
import eduupm.hsaas.registration.RegistrationReviewPort;
import eduupm.hsaas.registration.RegistrationVersions;

/** Owns C13 authorization/replay/audit orchestration; the M03 root alone validates and persists a decision. */
public final class ReviewService {
    private final RegistrationReviewPort root;
    private final SessionCapabilities capabilities;
    private final Accounts accounts;
    private final IdempotencyPort idempotency;
    private final LocalAuditPort audit;
    private final JsonMapper json;
    private final TransactionTemplate transaction;

    /** Explicit isolation enables current replay reads after waiting for the locked root. */
    public ReviewService(RegistrationReviewPort root, SessionCapabilities capabilities, Accounts accounts,
            IdempotencyPort idempotency, LocalAuditPort audit, JsonMapper json, PlatformTransactionManager manager) {
        this.root = root; this.capabilities = capabilities; this.accounts = accounts;
        this.idempotency = idempotency; this.audit = audit; this.json = json;
        this.transaction = new TransactionTemplate(manager);
        this.transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }

    /** Parsing preserves the immutable command's version and evidence before projection to the root union. */
    public IdempotencyPort.SafeResult verify(StaffContext context, String registrationId, String key, String body) {
        return execute(context, registrationId, key, "VERIFY", body);
    }
    /** Rejection differs only in its typed decision and local action; it never creates a notification. */
    public IdempotencyPort.SafeResult reject(StaffContext context, String registrationId, String key, String body) {
        return execute(context, registrationId, key, "REJECT", body);
    }

    /** No caller transaction may invert the user/counter prefix by retaining requireHuman's binding locks. */
    private IdempotencyPort.SafeResult execute(StaffContext context, String id, String key, String operation, String body) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Begin review orchestration outside a domain transaction");
        }
        if (context == null) throw ApiFailure.unauthenticated();
        // A lost unique insert rolls back the entire domain transaction before any retry can inspect its winner.
        for (int attempt = 0; attempt < 2; attempt++) {
            var actor = capabilities.requireHuman(context.bindingId(), context.ownerContextId(), context.generation(), context.login());
            requireStaff(actor);
            var coordinates = root.discover(id);
            if (coordinates == null || !Objects.equals(id, coordinates.id())) throw unavailable();
            var scope = new RequestEncoding.Scope(RequestEncoding.Kind.USER, Long.toString(actor.id()));
            boolean recoveryOnly = attempt > 0;
            try {
                return transaction.execute(status -> {
                    // User is the first lock. Its current role is checked before QR-specific owner/counter checks.
                    requireStaff(accounts.lock(actor.id()));
                    try { capabilities.lockOwners(List.of(new SessionCapabilities.OwnerUse(context.ownerContextId(), Long.parseLong(coordinates.counterId()))), null); }
                    catch (ApiFailure failure) {
                        if (failure.status() == 410 && "REGISTRATION_ENTRY_REVOKED".equals(failure.code())) throw unavailable();
                        throw failure;
                    }
                    // Object authorization precedes even command validation, keeping invisible IDs uniformly hidden.
                    var namespace = new IdempotencyPort.Namespace(scope, operation, coordinates.id(), IdempotencyPort.key(key));
                    Parsed command = parse(operation, scope, coordinates.id(), body);
                    var replay = idempotency.replay(namespace, command.encoding());
                    if (replay.isPresent()) return replay.get().result();
                    if (recoveryOnly) {
                        // A uniqueness loser may only inspect its winner in a new transaction, never reapply the review.
                        throw new ApiFailure(409, "IDEMPOTENCY_CONFLICT", "Check the original review result before retrying.");
                    }
                    var receipt = root.lock(coordinates);
                    // The second READ_COMMITTED lookup observes a winner which committed while this request waited.
                    replay = idempotency.replay(namespace, command.encoding());
                    if (replay.isPresent()) return replay.get().result();
                    var result = root.recordDecision(receipt, command.expectedVersion(), context.ownerContextId(), command.decision());
                    String expectedStatus = operation.equals("VERIFY") ? "VERIFIED" : "REJECTED";
                    if (!result.id().equals(coordinates.id()) || !result.status().equals(expectedStatus)
                            || result.version() > RegistrationVersions.MAX_SAFE || result.version() != command.expectedVersion() + 1) {
                        throw new IllegalStateException("Root review result violates its safe decision contract");
                    }
                    audit.append(operation.equals("VERIFY") ? LocalAuditPort.Action.REGISTRATION_VERIFIED : LocalAuditPort.Action.REGISTRATION_REJECTED,
                            "REGISTRATION", coordinates.id(), actor.id(), new LocalAuditPort.Snapshot(receipt.status(), result.status(), receipt.version(), result.version(),
                                    operation.equals("VERIFY") ? "SYNTHETIC_MANUAL" : "LOCAL"));
                    idempotency.success(namespace, command.encoding(), 200, result);
                    return result;
                });
            } catch (DuplicateKeyException conflict) {
                if (attempt == 1) throw new ApiFailure(409, "IDEMPOTENCY_CONFLICT", "Check the original review result.");
            }
        }
        throw new IllegalStateException("Review retry did not produce a result");
    }

    /** Only parsed fixed-schema input enters HMAC encoding; body/property order never becomes the hash protocol. */
    private Parsed parse(String operation, RequestEncoding.Scope scope, String id, String body) {
        if (operation.equals("VERIFY")) {
            var input = ReviewCommands.parseVerify(json, body);
            return new Parsed(input.expectedVersion(), input.decision(), ReviewCommands.encodeVerify(json, scope, id, input));
        }
        var input = ReviewCommands.parseReject(json, body);
        return new Parsed(input.expectedVersion(), input.decision(), ReviewCommands.encodeReject(json, scope, id, input));
    }
    private void requireStaff(Accounts.Account actor) {
        if (actor == null || !actor.active()) throw ApiFailure.unauthenticated();
        if (!"COUNTER_STAFF".equals(actor.role())) throw new ApiFailure(403, "ACCESS_DENIED", "Counter Staff access is required.");
    }
    private ApiFailure unavailable() { return new ApiFailure(404, "NOT_FOUND", "This registration is not available."); }

    /** The controller resolves these coordinates from the framework session; this type is never a JSON request. */
    public record StaffContext(String bindingId, String ownerContextId, Long generation, String login) {
        @Override public String toString() { return "StaffContext[REDACTED]"; }
    }
    /** Encoding bytes are used only transiently inside the command and never logged or persisted directly. */
    private record Parsed(long expectedVersion, RegistrationReviewPort.Decision decision, byte[] encoding) {
        @Override public String toString() { return "ParsedReview[REDACTED]"; }
    }
}
