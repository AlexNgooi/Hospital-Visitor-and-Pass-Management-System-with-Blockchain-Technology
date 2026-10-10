package eduupm.hsaas.registration;

import java.util.List;
import java.util.Set;
import eduupm.hsaas.common.ApiFailure;

/** Field-independent root transition policy; authority, transaction receipt and SQL CAS remain adapter responsibilities. */
public final class RegistrationDecisions {
    private static final Set<String> CATEGORIES = Set.of("EXECUTIVE", "PENJAGA", "VENDOR", "CONTRACTOR");
    private static final Set<String> REASONS = Set.of("INFORMATION_INCOMPLETE", "IDENTITY_NOT_CONFIRMED",
            "MRN_WARD_NOT_CONFIRMED", "INFORMATION_NOT_CONFIRMED");

    private RegistrationDecisions() { }

    /** Call only for a new command after both successful replay checks; completed states are never applied again. */
    public static Change apply(String category, String currentState, long currentVersion, long expectedVersion,
            RegistrationReviewPort.Decision decision) {
        RegistrationVersions.checked(currentVersion);
        RegistrationVersions.checked(expectedVersion);
        if (!"SUBMITTED".equals(currentState)) {
            throw new ApiFailure(409, "REGISTRATION_STATE_CONFLICT", "Registration is no longer awaiting review.");
        }
        if (currentVersion != expectedVersion) {
            throw new ApiFailure(409, "VERSION_CONFLICT", "Registration changed. Refresh before reviewing.");
        }
        if (category == null || !CATEGORIES.contains(category) || decision == null) {
            throw invalid();
        }
        long next = RegistrationVersions.next(currentVersion);
        if (decision instanceof RegistrationReviewPort.Verified verified) {
            SyntheticReviewRules.verify("PENJAGA".equals(category), verified.identityConfirmed(),
                    verified.mrnConfirmed(), verified.wardConfirmed(), verified.manualEvidence());
            return new Change("VERIFIED", next, "SYNTHETIC_MANUAL", verified.manualEvidence().methodCode(),
                    verified.manualEvidence().basisCodes().stream().sorted().toList(), null);
        }
        var rejected = (RegistrationReviewPort.Rejected) decision;
        if (rejected.reasonCode() == null || !REASONS.contains(rejected.reasonCode())
                || (!"PENJAGA".equals(category) && "MRN_WARD_NOT_CONFIRMED".equals(rejected.reasonCode()))) {
            throw invalid();
        }
        return new Change("REJECTED", next, "LOCAL", null, List.of(), rejected.reasonCode());
    }

    /** Untrusted category/reason strings are not reflected in diagnostics. */
    private static ApiFailure invalid() {
        return new ApiFailure(400, "VALIDATION_FAILED", "Check the required review fields.");
    }

    /** Immutable structural metadata carries no actor/time from the caller and no patient or free-note data. */
    public record Change(String status, long version, String source, String methodCode,
            List<String> basisCodes, String reasonCode) {
        public Change { basisCodes = List.copyOf(basisCodes); }
    }
}
