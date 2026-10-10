package eduupm.hsaas.registration.review;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import eduupm.hsaas.auth.Accounts;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.registration.RegistrationReadPort;
import eduupm.hsaas.registration.RegistrationReviewPort;

/** Owns current review-read authority; the sole M03 root produces and consumes the exact-transaction masked scope. */
public final class ReviewReadService {
    private final RegistrationReadPort reads;
    private final RegistrationReviewPort roots;
    private final SessionCapabilities capabilities;
    private final Accounts accounts;
    private final TransactionTemplate transaction;

    /** Locking authorization needs a normal RC transaction even though the root operation only SELECTs masked data. */
    public ReviewReadService(RegistrationReadPort reads, RegistrationReviewPort roots, SessionCapabilities capabilities,
            Accounts accounts, PlatformTransactionManager manager) {
        this.reads = reads; this.roots = roots; this.capabilities = capabilities; this.accounts = accounts;
        this.transaction = new TransactionTemplate(manager);
        this.transaction.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
    }

    /** A query counter narrows one selected view; it is not passed to the root until the complete current prefix holds. */
    public RegistrationReadPort.QueuePage queue(ReviewService.StaffContext context, Map<String, List<String>> parameters) {
        var actor = currentActor(context);
        var selection = ReviewQueries.queue(parameters);
        return transaction.execute(status -> {
            guard(context, actor.id(), selection.counterId());
            var scope = reads.captureReadScope(context.ownerContextId(), selection.counterId());
            var result = reads.readMaskedQueue(scope, new RegistrationReadPort.ReadQuery(
                    selection.category(), selection.status(), selection.page(), selection.pageSize()));
            // Fail closed on an adapter contract violation without attempting another scope/read or leaking its body.
            if (result == null || result.page() != selection.page() || result.pageSize() != selection.pageSize()
                    || result.items().stream().anyMatch(item -> !selection.counterId().equals(item.counterId()))) {
                throw new IllegalStateException("Masked queue violates its selected-counter contract");
            }
            return result;
        });
    }

    /** Discovery is internal, not existence authorization; absence and inaccessible counters share the same safe failure. */
    public RegistrationReadPort.Detail detail(ReviewService.StaffContext context, String id, Map<String, List<String>> parameters) {
        var actor = currentActor(context);
        if (parameters == null || !parameters.isEmpty()) throw new ApiFailure(400, "VALIDATION_FAILED", "Check the registration detail request.");
        var coordinates = roots.discover(id);
        if (coordinates == null || !Objects.equals(id, coordinates.id())) throw unavailable();
        return transaction.execute(status -> {
            guard(context, actor.id(), coordinates.counterId());
            var scope = reads.captureReadScope(context.ownerContextId(), coordinates.counterId());
            var result = reads.readMaskedDetail(scope, id);
            if (result == null) throw unavailable();
            if (!id.equals(result.id()) || !coordinates.counterId().equals(result.counterId())) {
                throw new IllegalStateException("Masked detail violates its authorized coordinates");
            }
            return result;
        });
    }

    /** Binding/context pre-read locks end before the selected counter enters the outer ordered authorization transaction. */
    private Accounts.Account currentActor(ReviewService.StaffContext context) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Begin review reads outside a domain transaction");
        }
        if (context == null) throw ApiFailure.unauthenticated();
        var actor = capabilities.requireHuman(context.bindingId(), context.ownerContextId(), context.generation(), context.login());
        requireStaff(actor); return actor;
    }
    /** User -> counter -> binding/context guards remain held through the complete root count/items or detail operation. */
    private void guard(ReviewService.StaffContext context, long actorId, String counterId) {
        requireStaff(accounts.lock(actorId));
        try { capabilities.lockOwners(List.of(new SessionCapabilities.OwnerUse(context.ownerContextId(), Long.parseLong(counterId))), null); }
        catch (ApiFailure failure) {
            if (failure.status() == 410 && "REGISTRATION_ENTRY_REVOKED".equals(failure.code())) throw unavailable();
            throw failure;
        }
    }
    private void requireStaff(Accounts.Account actor) {
        if (actor == null || !actor.active()) throw ApiFailure.unauthenticated();
        if (!"COUNTER_STAFF".equals(actor.role())) throw new ApiFailure(403, "ACCESS_DENIED", "Counter Staff access is required.");
    }
    private ApiFailure unavailable() { return new ApiFailure(404, "NOT_FOUND", "This registration is not available."); }
}
