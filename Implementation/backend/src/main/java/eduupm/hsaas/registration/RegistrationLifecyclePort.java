package eduupm.hsaas.registration;

import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Read-only M05 facet of the existing registration root; lifecycle never changes its verified decision. */
public interface RegistrationLifecyclePort {
    /** Only catalogue identifiers/labels cross lifecycle boundaries; patient data remains inside registration. */
    record Destination(String id, String code, String label) { }
    /** Discovery is internal and does not authorize a caller or reveal a hidden registration over HTTP. */
    RegistrationReviewPort.ReviewCoordinates discover(String registrationId);

    /** Caller already holds the complete current authority prefix before device and root locks. */
    Access lockLifecycle(RegistrationReviewPort.ReviewCoordinates coordinates, String serverOwnerContextId);

    /** Only current Counter Staff may reveal the minimal phone after an assignment-scoped audited command. */
    Contact lifecycleContact(Access access);

    /** Internal transaction receipt carries safe eligibility fields, never a raw form-data object. */
    final class Access {
        private final RegistrationReviewPort.ReviewCoordinates coordinates;
        private final String reference, categoryId, categoryCode, status, environment, origin, maskedName, maskedPhone;
        private final long version;
        private final boolean staff;
        private final String fieldSchemaVersion;
        private final java.util.List<Destination> destinations;
        private final TransactionSynchronization marker;

        /** Only the root package constructs a receipt after its authority and root checks. */
        Access(RegistrationReviewPort.ReviewCoordinates coordinates, String reference, String categoryId,
                String categoryCode, String status, String environment, String origin, long version,
                String maskedName, String maskedPhone, boolean staff) {
            this(coordinates, reference, categoryId, categoryCode, status, environment, origin, version,
                    maskedName, maskedPhone, staff, RegistrationFields.LEGACY_VERSION, java.util.List.of());
        }
        /** Current root captures active issue destinations only after ordered reference and registration locks. */
        Access(RegistrationReviewPort.ReviewCoordinates coordinates, String reference, String categoryId,
                String categoryCode, String status, String environment, String origin, long version,
                String maskedName, String maskedPhone, boolean staff, String fieldSchemaVersion,
                java.util.List<Destination> destinations) {
            requireTransaction();
            this.coordinates=coordinates; this.reference=reference; this.categoryId=categoryId; this.categoryCode=categoryCode;
            this.status=status; this.environment=environment; this.origin=origin; this.version=version;
            this.maskedName=maskedName; this.maskedPhone=maskedPhone; this.staff=staff;
            this.fieldSchemaVersion=fieldSchemaVersion; this.destinations=java.util.List.copyOf(destinations);
            marker=new TransactionSynchronization() {
                @Override public void afterCompletion(int completionStatus) {
                    TransactionSynchronizationManager.unbindResourceIfPossible(Access.this);
                }
            };
            TransactionSynchronizationManager.bindResource(this,marker);
            TransactionSynchronizationManager.registerSynchronization(marker);
        }
        /** Exact synchronization identity rejects a suspended outer receipt before any contact SQL. */
        void consumeContact() {
            requireTransaction();
            if (!staff || TransactionSynchronizationManager.getResource(this)!=marker
                    || TransactionSynchronizationManager.getSynchronizations().stream().noneMatch(value->value==marker)) {
                throw new IllegalStateException("Contact requires the original staff lifecycle transaction");
            }
            TransactionSynchronizationManager.unbindResource(this);
        }
        static void requireTransaction() {
            if (!TransactionSynchronizationManager.isActualTransactionActive()
                    || !TransactionSynchronizationManager.isSynchronizationActive()
                    || !Integer.valueOf(TransactionDefinition.ISOLATION_READ_COMMITTED)
                        .equals(TransactionSynchronizationManager.getCurrentTransactionIsolationLevel())) {
                throw new IllegalStateException("Lifecycle root access requires READ_COMMITTED");
            }
        }
        public RegistrationReviewPort.ReviewCoordinates coordinates() { return coordinates; }
        public String reference() { return reference; }
        public String categoryId() { return categoryId; }
        public String categoryCode() { return categoryCode; }
        public String status() { return status; }
        public String environment() { return environment; }
        public String origin() { return origin; }
        public long version() { return version; }
        public String maskedName() { return maskedName; }
        public String maskedPhone() { return maskedPhone; }
        public String fieldSchemaVersion() { return fieldSchemaVersion; }
        public java.util.List<Destination> destinations() { return destinations; }
        public boolean multipleActivePassesAllowed() { return java.util.Set.of("VENDOR", "CONTRACTOR").contains(categoryCode); }
    }

    /** Reveal is a short-lived response only; it is never stored in idempotency, audit or lifecycle payloads. */
    record Contact(String phone) {
        @Override public String toString() { return "Contact[REDACTED]"; }
    }
}
