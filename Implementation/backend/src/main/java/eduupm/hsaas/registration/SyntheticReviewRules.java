package eduupm.hsaas.registration;

import java.util.HashSet;
import java.util.Set;
import eduupm.hsaas.common.ApiFailure;

/** Validates C09 attestations only; current staff authority and SYNTHETIC_MANUAL provenance are server responsibilities. */
public final class SyntheticReviewRules {
    private static final Set<String> IDENTITY = Set.of("IDENTITY_MATCH_CONFIRMED");
    private static final Set<String> PENJAGA = Set.of(
            "IDENTITY_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED", "WARD_MATCH_CONFIRMED");

    private SyntheticReviewRules() { }

    /** A mock MATCH is deliberately absent: only a staff command carrying every required attestation can proceed. */
    public static void verify(boolean penjaga, Boolean identityConfirmed, Boolean mrnConfirmed,
            Boolean wardConfirmed, ManualEvidence evidence) {
        if (!Boolean.TRUE.equals(identityConfirmed) || evidence == null
                || !"SYNTHETIC_RECORD_COMPARISON".equals(evidence.methodCode())
                || evidence.basisCodes() == null) {
            throw invalid();
        }
        if (penjaga) {
            if (!Boolean.TRUE.equals(mrnConfirmed) || !Boolean.TRUE.equals(wardConfirmed)) {
                throw invalid();
            }
        } else if (mrnConfirmed != null || wardConfirmed != null) {
            // Even an explicit false is a cross-category field injection, not a missing field.
            throw invalid();
        }
        var required = penjaga ? PENJAGA : IDENTITY;
        var supplied = evidence.basisCodes();
        if (supplied.size() != required.size() || supplied.stream().anyMatch(value -> value == null
                || !value.matches("[A-Z_]{1,64}")) || !new HashSet<>(supplied).equals(required)) {
            throw invalid();
        }
    }

    /** Diagnostics omit untrusted codes and any raw patient input. */
    private static ApiFailure invalid() {
        return new ApiFailure(400, "VALIDATION_FAILED", "Complete the required verification evidence.");
    }
}
