package eduupm.hsaas.registration;

import java.util.List;
import java.util.Set;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import eduupm.hsaas.common.ApiFailure;

/** The read facet of the single M03 root; HTTP supplies server owner context, never a caller-authored authority list. */
public interface RegistrationReadPort {
    /** Requires RC before SQL, then current role and the M00 account/counter/binding/owner prefix. */
    ReadScope captureReadScope(String serverOwnerContextId, String counterId);

    /** One scope operation includes both count and items, with SQL filtering the guarded single counter. */
    QueuePage readMaskedQueue(ReadScope scope, ReadQuery query);

    /** Exact-scope validation precedes any SQL; missing and cross-counter IDs share the same 404 response. */
    Detail readMaskedDetail(ReadScope scope, String registrationId);

    /** Missing filters mean ALL internally; the wire never requires an ALL value or a second pagination scheme. */
    record ReadQuery(String category, String status, int page, int pageSize) {
        public ReadQuery {
            if (category != null && !Set.of("EXECUTIVE", "PENJAGA", "VENDOR", "CONTRACTOR").contains(category)
                    || status != null && !Set.of("SUBMITTED", "VERIFIED", "REJECTED", "CANCELLED").contains(status)
                    || page < 0 || pageSize < 1 || pageSize > 50 || (long) page * pageSize > Integer.MAX_VALUE) {
                throw new ApiFailure(400, "VALIDATION_FAILED", "Check the review filters and page.");
            }
        }
    }

    /** Exact M04 queue wire; safe integer totals and immutable collections cannot change after a query. */
    record QueuePage(List<QueueItem> items, long total, int page, int pageSize, String serverNow) {
        public QueuePage {
            items = List.copyOf(items);
            if (total < 0 || total > RegistrationVersions.MAX_SAFE || items.size() > 50) {
                throw new IllegalStateException("Invalid masked queue projection");
            }
        }
    }

    /** Only a masked identity label, controlled location and non-sensitive operational fields cross the root boundary. */
    record QueueItem(String id, String publicReference, String counterId, String categoryCode,
            String maskedVisitorName, String destinationLabel, String status, long version, String submittedAt) { }

    /** Required nullable MRN/review properties stay explicit null, without raw form JSON or a reveal path. */
    record Detail(String id, String publicReference, String counterId, String categoryCode,
            String maskedVisitorName, String destinationLabel, String status, long version, String submittedAt,
            String maskedIdentification, String maskedPhone, String maskedMrn, String mrnMode, String mrnFeedback,
            String environment, String source, ReviewMetadata review) { }

    /** Staff identity/time/source and allowlisted C09 codes only, never free notes, documents or patient details. */
    record ReviewMetadata(String actorId, String reviewedAt, String source, String methodCode,
            List<String> basisCodes, String reasonCode) {
        public ReviewMetadata { basisCodes = List.copyOf(basisCodes); }
    }

    /** Opaque one-read authority; only the root package can capture it after the actual current permission prefix. */
    @tools.jackson.databind.annotation.JsonSerialize(using = ScopeSerializer.class)
    @tools.jackson.databind.annotation.JsonDeserialize(using = ScopeDeserializer.class)
    final class ReadScope {
        private final String ownerContextId, counterId;
        private final long actorId;
        private final TransactionSynchronization marker;

        /** The adapter derives actor/coordinates from guarded database state, not JSON or the query filter. */
        static ReadScope capture(String ownerContextId, long actorId, String counterId) {
            requireTransaction();
            return new ReadScope(ownerContextId, actorId, counterId);
        }

        private ReadScope(String ownerContextId, long actorId, String counterId) {
            if (ownerContextId == null || actorId <= 0 || counterId == null
                    || !counterId.matches("[1-9][0-9]{0,18}")) {
                throw new IllegalArgumentException("Invalid internal read scope");
            }
            Long.parseLong(counterId);
            this.ownerContextId = ownerContextId;
            this.actorId = actorId;
            this.counterId = counterId;
            this.marker = new TransactionSynchronization() {
                /** Completion makes even an unused read scope unusable in a later transaction. */
                @Override public void afterCompletion(int status) {
                    TransactionSynchronizationManager.unbindResourceIfPossible(ReadScope.this);
                }
            };
            TransactionSynchronizationManager.bindResource(this, marker);
            TransactionSynchronizationManager.registerSynchronization(marker);
        }

        /** Root reads must call this first, before even an owner/registration query or row count. */
        void consume() {
            requireTransaction();
            if (TransactionSynchronizationManager.getResource(this) != marker
                    || TransactionSynchronizationManager.getSynchronizations().stream().noneMatch(value -> value == marker)) {
                throw new IllegalStateException("Capture this read scope in the current transaction");
            }
            TransactionSynchronizationManager.unbindResource(this);
        }

        /** This is also the factory's first action; never retain binding locks then discover an earlier counter. */
        static void requireTransaction() {
            if (!TransactionSynchronizationManager.isActualTransactionActive()
                    || !TransactionSynchronizationManager.isSynchronizationActive()
                    || !Integer.valueOf(TransactionDefinition.ISOLATION_READ_COMMITTED)
                            .equals(TransactionSynchronizationManager.getCurrentTransactionIsolationLevel())) {
                throw new IllegalStateException("Masked reads require the original READ_COMMITTED transaction");
            }
        }

        /** Package-only coordinates are for SQL filtering, not a serializable authorization token. */
        String ownerContextId() { return ownerContextId; }
        long actorId() { return actorId; }
        String counterId() { return counterId; }
        @Override public String toString() { return "ReadScope[REDACTED]"; }
    }

    /** Even an accidental controller return cannot turn an internal authority receipt into JSON. */
    final class ScopeSerializer extends tools.jackson.databind.ValueSerializer<ReadScope> {
        @Override public void serialize(ReadScope value, tools.jackson.core.JsonGenerator output,
                tools.jackson.databind.SerializationContext context) {
            throw new IllegalStateException("Read scopes cannot be serialized");
        }
    }

    /** HTTP JSON can never reconstruct a scope, its server-derived coordinates or transaction identity. */
    final class ScopeDeserializer extends tools.jackson.databind.ValueDeserializer<ReadScope> {
        @Override public ReadScope deserialize(tools.jackson.core.JsonParser input,
                tools.jackson.databind.DeserializationContext context) {
            throw new IllegalStateException("Read scopes cannot be deserialized");
        }
    }
}
