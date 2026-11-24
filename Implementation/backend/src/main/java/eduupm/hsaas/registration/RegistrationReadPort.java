package eduupm.hsaas.registration;

import java.util.List;
import java.util.Set;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import eduupm.hsaas.common.ApiFailure;

/** The read facet of the single M03 root; HTTP supplies server owner context, never a caller-authored authority list. */
public interface RegistrationReadPort {
    /** Requires RC before SQL, then current role and the M00 account/binding/owner prefix. */
    ReadScope captureReadScope(String serverOwnerContextId);

    /** One scope operation includes both count and items, with SQL filtering the current environment. */
    QueuePage readMaskedQueue(ReadScope scope, ReadQuery query);

    /** Exact-scope validation precedes any SQL; missing and out-of-environment IDs share the same 404 response. */
    Detail readMaskedDetail(ReadScope scope, String registrationId);

    /** Explicit CSRF-protected audited staff comparison, separate from the masked default projection. */
    default ReviewFields readReviewFields(ReadScope scope, String registrationId, long expectedVersion) {
        throw new IllegalStateException("The registration adapter does not support explicit review fields");
    }

    /** Only a bounded schema-aware allowlist may be revealed; never expose arbitrary root JSON or diagnostics. */
    record ReviewFields(String id, long version, String fieldSchemaVersion, List<ReviewField> fields, Consent terms) {
        public ReviewFields { fields = List.copyOf(fields); }
        @Override public String toString() { return "ReviewFields[REDACTED]"; }
    }
    record ReviewField(String name, String label, String value) {
        @Override public String toString() { return "ReviewField[REDACTED]"; }
    }
    record Consent(String policyVersion, String capturedAt) { }

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

    /** Authorized queues include a bounded staff name preview, never the complete form or identifiers. */
    record QueueItem(String id, String publicReference, String categoryCode,
            String maskedVisitorName, String destinationLabel, String status, long version, String submittedAt, String visitorDisplayName) {
        /** Older injected read adapters keep their masked fallback while the current root supplies the preview. */
        public QueueItem(String id, String publicReference, String categoryCode,
                String maskedVisitorName, String destinationLabel, String status, long version, String submittedAt) {
            this(id, publicReference, categoryCode, maskedVisitorName, destinationLabel, status, version, submittedAt, maskedVisitorName);
        }
        @Override public String toString() { return "QueueItem[REDACTED]"; }
    }

    /** Required nullable MRN/review properties stay explicit null, without raw form JSON or a reveal path. */
    record Detail(String id, String publicReference, String categoryCode,
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
        private final TransactionSynchronization marker;

        static ReadScope capture() {
            requireTransaction();
            return new ReadScope();
        }

        private ReadScope() {
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

        /** This is also the factory's first action; never use the receipt in a different transaction. */
        static void requireTransaction() {
            if (!TransactionSynchronizationManager.isActualTransactionActive()
                    || !TransactionSynchronizationManager.isSynchronizationActive()
                    || !Integer.valueOf(TransactionDefinition.ISOLATION_READ_COMMITTED)
                            .equals(TransactionSynchronizationManager.getCurrentTransactionIsolationLevel())) {
                throw new IllegalStateException("Masked reads require the original READ_COMMITTED transaction");
            }
        }

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
