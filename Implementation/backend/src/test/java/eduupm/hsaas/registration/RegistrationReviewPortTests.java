package eduupm.hsaas.registration;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.common.IdempotencyPort.SafeResult;
import static org.assertj.core.api.Assertions.*;

/** Exercises actual Spring synchronization suspend/resume with a mock root; no database/authority acceptance is claimed. */
class RegistrationReviewPortTests {
    private final StubTransactionManager manager = new StubTransactionManager();
    private final TransactionTemplate outer = transaction(TransactionDefinition.PROPAGATION_REQUIRED);
    private final TransactionTemplate inner = transaction(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    private final StubRoot root = new StubRoot();
    private static final RegistrationReviewPort.Decision VERIFY = new RegistrationReviewPort.Verified(true, true, true,
            new ManualEvidence("SYNTHETIC_RECORD_COMPARISON", List.of("IDENTITY_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED", "WARD_MATCH_CONFIRMED")));

    /** A receipt is consumed at most once, and completion prevents SQL in a later transaction. */
    @Test void allowsOneUseOnlyAndRejectsAfterCompletionBeforeSql() {
        var receipt = outer.execute(status -> {
            var locked = root.lock(root.discover("1"));
            assertThat(root.recordDecision(locked, 0, "synthetic-server-owner", VERIFY).status()).isEqualTo("VERIFIED");
            int reads = root.sqlReads;
            assertThatThrownBy(() -> root.recordDecision(locked, 0, "synthetic-server-owner", VERIFY)).isInstanceOf(IllegalStateException.class);
            assertThat(root.sqlReads).isEqualTo(reads);
            return locked;
        });
        int reads = root.sqlReads;
        assertThatThrownBy(() -> outer.execute(status -> root.recordDecision(receipt, 0, "synthetic-server-owner", VERIFY)))
                .isInstanceOf(IllegalStateException.class);
        assertThat(root.sqlReads).isEqualTo(reads);
    }

    /** A suspended thread resource cannot authorize an inner transaction; the resumed outer receipt remains usable. */
    @Test void rejectsRequiresNewBeforeReadsAndPreservesOuterReceipt() {
        outer.executeWithoutResult(status -> {
            var receipt = root.lock(root.discover("1"));
            int reads = root.sqlReads;
            inner.executeWithoutResult(nested -> {
                assertThatThrownBy(() -> root.recordDecision(receipt, 0, "synthetic-server-owner", VERIFY)).isInstanceOf(IllegalStateException.class);
                assertThat(root.sqlReads).isEqualTo(reads);
            });
            assertThat(root.recordDecision(receipt, 0, "synthetic-server-owner", VERIFY).version()).isEqualTo(1);
        });
    }

    /** Locking a completed root is allowed for the second replay lookup, but a new decision remains forbidden. */
    @Test void locksAllStatesWithoutBypassingStateOrVersionConflicts() {
        for (String state : List.of("VERIFIED", "REJECTED", "CANCELLED")) {
            root.state = state;
            outer.executeWithoutResult(status -> {
                var receipt = root.lock(root.discover("1"));
                assertThat(receipt.status()).isEqualTo(state);
                assertThatThrownBy(() -> root.recordDecision(receipt, 0, "synthetic-server-owner", VERIFY))
                        .isInstanceOfSatisfying(ApiFailure.class, failure -> assertThat(failure.code()).isEqualTo("REGISTRATION_STATE_CONFLICT"));
            });
        }
        root.state = "SUBMITTED";
        root.version = 2;
        outer.executeWithoutResult(status -> assertThatThrownBy(() -> root.recordDecision(root.lock(root.discover("1")), 1,
                "synthetic-server-owner", VERIFY)).isInstanceOfSatisfying(ApiFailure.class,
                failure -> assertThat(failure.code()).isEqualTo("VERSION_CONFLICT")));
    }

    /** Terminal and invalid versions reject without silently wrapping, including on a pending root. */
    @Test void fencesSafeIntegerBoundaries() {
        assertThat(RegistrationVersions.next(RegistrationVersions.MAX_SAFE - 1)).isEqualTo(RegistrationVersions.MAX_SAFE);
        assertThatThrownBy(() -> RegistrationVersions.checked(-1)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> RegistrationVersions.checked(RegistrationVersions.MAX_SAFE + 1)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> RegistrationVersions.next(RegistrationVersions.MAX_SAFE))
                .isInstanceOfSatisfying(ApiFailure.class, failure -> assertThat(failure.code()).isEqualTo("VERSION_CONFLICT"));
        root.version = RegistrationVersions.MAX_SAFE;
        outer.executeWithoutResult(status -> assertThatThrownBy(() -> root.recordDecision(root.lock(root.discover("1")), root.version,
                "synthetic-server-owner", VERIFY)).isInstanceOf(ApiFailure.class));
        assertThat(root.state).isEqualTo("SUBMITTED");
    }

    /** A rollback/unused receipt expires at completion, and capture cannot occur outside a reviewed transaction. */
    @Test void rejectsUnusedRolledBackAndWrongIsolationReceipts() {
        assertThatThrownBy(() -> root.lock(root.discover("1"))).isInstanceOf(IllegalStateException.class);
        var rolledBack = outer.execute(status -> {
            var receipt = root.lock(root.discover("1"));
            status.setRollbackOnly();
            return receipt;
        });
        int reads = root.sqlReads;
        assertThatThrownBy(() -> outer.execute(status -> root.recordDecision(rolledBack, 0, "synthetic-server-owner", VERIFY)))
                .isInstanceOf(IllegalStateException.class);
        assertThat(root.sqlReads).isEqualTo(reads);
        var differentIsolation = transaction(TransactionDefinition.PROPAGATION_REQUIRED);
        differentIsolation.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        assertThatThrownBy(() -> differentIsolation.execute(status -> root.lock(root.discover("1"))))
                .isInstanceOf(IllegalStateException.class);
    }

    /** Test wiring uses Spring's real synchronization lifecycle without a database or fabricated authorization result. */
    private TransactionTemplate transaction(int propagation) {
        var value = new TransactionTemplate(manager);
        value.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        value.setPropagationBehavior(propagation);
        return value;
    }

    /** Counts modeled SQL entry points so receipt rejection demonstrably happens before any adapter read. */
    private static final class StubRoot implements RegistrationReviewPort {
        private String state = "SUBMITTED";
        private long version;
        private int sqlReads;

        @Override public ReviewCoordinates discover(String id) { return new ReviewCoordinates(id, "1"); }
        @Override public LockedRegistration lock(ReviewCoordinates coordinates) {
            return LockedRegistration.capture(coordinates, "PENJAGA", state, version, "test");
        }
        @Override public SafeResult recordDecision(LockedRegistration receipt, long expectedVersion,
                String serverOwnerContextId, Decision decision) {
            receipt.consumeReceipt();
            RegistrationVersions.checked(expectedVersion);
            sqlReads++;
            if (!"SUBMITTED".equals(state)) { throw new ApiFailure(409, "REGISTRATION_STATE_CONFLICT", "State changed."); }
            if (version != expectedVersion) { throw new ApiFailure(409, "VERSION_CONFLICT", "Version changed."); }
            long next = RegistrationVersions.next(version);
            if (decision instanceof Verified verify) {
                SyntheticReviewRules.verify(true, verify.identityConfirmed(), verify.mrnConfirmed(), verify.wardConfirmed(), verify.manualEvidence());
                state = "VERIFIED";
            } else { state = "REJECTED"; }
            version = next;
            return new SafeResult(receipt.coordinates().id(), "R_SYNTHETIC_CONTRACT", state, version);
        }
    }

    /** Supplies only transaction lifecycle; AbstractPlatformTransactionManager manages the actual suspend/resume markers. */
    private static final class StubTransactionManager extends AbstractPlatformTransactionManager {
        private final ThreadLocal<Boolean> active = new ThreadLocal<>();
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected boolean isExistingTransaction(Object transaction) { return Boolean.TRUE.equals(active.get()); }
        @Override protected void doBegin(Object transaction, TransactionDefinition definition) { active.set(true); }
        @Override protected Object doSuspend(Object transaction) { Boolean current = active.get(); active.remove(); return current; }
        @Override protected void doResume(Object transaction, Object suspended) { active.set((Boolean) suspended); }
        @Override protected void doCommit(DefaultTransactionStatus status) { }
        @Override protected void doRollback(DefaultTransactionStatus status) { }
        @Override protected void doCleanupAfterCompletion(Object transaction) { active.remove(); }
    }
}
