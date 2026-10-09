package eduupm.hsaas.registration;

import java.util.Set;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import eduupm.hsaas.common.IdempotencyPort.SafeResult;

/** M03's sole root boundary; M04 owns HTTP, current authority, replay and the outer review transaction. */
public interface RegistrationReviewPort {
    /** Internal non-locking discovery supplies coordinates for the ordered security prefix, never HTTP authorization. */
    ReviewCoordinates discover(String registrationId);

    /** After the complete staff/counter prefix, locks the root in the caller's READ_COMMITTED transaction. */
    LockedRegistration lock(ReviewCoordinates coordinates);

    /** Checks the exact receipt before any SQL, then records a CAS decision without independent commit/audit/idempotency. */
    SafeResult recordDecision(LockedRegistration receipt, long expectedVersion,
            String serverOwnerContextId, Decision decision);

    /** Safe decimal-string identities avoid numeric precision loss in downstream browser DTOs. */
    record ReviewCoordinates(String id, String counterId) {
        /** Coordinates are validated but do not carry authority; the adapter must re-read their immutable mapping. */
        public ReviewCoordinates {
            requireId(id);
            requireId(counterId);
        }

        private static void requireId(String value) {
            try {
                if (value == null || !value.matches("[1-9][0-9]{0,18}")) {
                    throw new IllegalArgumentException();
                }
                Long.parseLong(value);
            } catch (RuntimeException failure) {
                throw new IllegalArgumentException("Invalid internal registration coordinates");
            }
        }
    }

    /** Only explicit reviewed transitions are representable, never arbitrary client-selected states or sources. */
    sealed interface Decision permits Verified, Rejected { }

    /** HTTP parsing/hashing must preserve MISSING/NULL before projecting to these nullable values. */
    record Verified(Boolean identityConfirmed, Boolean mrnConfirmed, Boolean wardConfirmed,
            ManualEvidence manualEvidence) implements Decision {
        /** Unvalidated attestations must not leak into diagnostics. */
        @Override public String toString() { return "Verified[REDACTED]"; }
    }

    /** C09 safe reason codes are validated by the root; there is no free text or attachment. */
    record Rejected(String reasonCode) implements Decision {
        /** Caller-selected invalid codes must not become log content. */
        @Override public String toString() { return "Rejected[REDACTED]"; }
    }

    /** An internal one-use root receipt; controllers never accept or serialize this type. */
    final class LockedRegistration {
        private final ReviewCoordinates coordinates;
        private final String categoryCode, status, environment;
        private final long version;
        private final TransactionSynchronization marker;

        /** The root package creates a receipt only after locking and re-reading coordinates in the original transaction. */
        static LockedRegistration capture(ReviewCoordinates coordinates, String categoryCode, String status,
                long version, String environment) {
            requireTransaction();
            return new LockedRegistration(coordinates, categoryCode, status, version, environment);
        }

        private LockedRegistration(ReviewCoordinates coordinates, String categoryCode, String status,
                long version, String environment) {
            if (coordinates == null || !Set.of("EXECUTIVE", "PENJAGA", "VENDOR", "CONTRACTOR").contains(categoryCode)
                    || !Set.of("SUBMITTED", "VERIFIED", "REJECTED", "CANCELLED").contains(status)
                    || !Set.of("production", "development", "synthetic", "test").contains(environment)) {
                throw new IllegalArgumentException("Invalid locked registration projection");
            }
            this.coordinates = coordinates;
            this.categoryCode = categoryCode;
            this.status = status;
            this.version = RegistrationVersions.checked(version);
            this.environment = environment;
            this.marker = new TransactionSynchronization() {
                /** Completion releases even unused receipts; rollback never grants a future transaction access. */
                @Override public void afterCompletion(int completionStatus) {
                    TransactionSynchronizationManager.unbindResourceIfPossible(LockedRegistration.this);
                }
            };
            TransactionSynchronizationManager.bindResource(this, marker);
            TransactionSynchronizationManager.registerSynchronization(marker);
        }

        /** Must be the root adapter's first recordDecision action, before owner, registration or any other SQL. */
        void consumeReceipt() {
            requireTransaction();
            if (TransactionSynchronizationManager.getResource(this) != marker
                    || TransactionSynchronizationManager.getSynchronizations().stream().noneMatch(value -> value == marker)) {
                // Thread resources survive some transaction suspensions; the exact synchronization list does not.
                throw new IllegalStateException("Lock this registration in the current transaction before recording a decision");
            }
            TransactionSynchronizationManager.unbindResource(this);
        }

        /** The reviewed template establishes explicit isolation; framework-session writes stay outside this transaction. */
        private static void requireTransaction() {
            if (!TransactionSynchronizationManager.isActualTransactionActive()
                    || !TransactionSynchronizationManager.isSynchronizationActive()
                    || !Integer.valueOf(TransactionDefinition.ISOLATION_READ_COMMITTED)
                            .equals(TransactionSynchronizationManager.getCurrentTransactionIsolationLevel())) {
                throw new IllegalStateException("Review receipts require the original READ_COMMITTED transaction");
            }
        }

        /** Safe root projections support the caller's single audit append, without raw form or evidence values. */
        public ReviewCoordinates coordinates() { return coordinates; }
        public String categoryCode() { return categoryCode; }
        public String status() { return status; }
        public long version() { return version; }
        public String environment() { return environment; }
    }
}
