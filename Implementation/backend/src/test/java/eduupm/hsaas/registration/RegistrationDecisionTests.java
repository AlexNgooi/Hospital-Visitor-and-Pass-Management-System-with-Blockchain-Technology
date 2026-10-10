package eduupm.hsaas.registration;

import java.util.List;
import org.junit.jupiter.api.Test;
import eduupm.hsaas.common.ApiFailure;
import static org.assertj.core.api.Assertions.*;

/** Exercises the actual root policy without claiming SQL/authority acceptance or a completed review endpoint. */
class RegistrationDecisionTests {
    /** Every category can be reviewed with its exact evidence; non-Penjaga cannot smuggle MRN checks. */
    @Test void categoryEvidenceIsExactAndMetadataIsStructural() {
        for (String category : List.of("EXECUTIVE", "VENDOR", "CONTRACTOR")) {
            var accepted = RegistrationDecisions.apply(category, "SUBMITTED", 0, 0, verified(false));
            assertThat(accepted.status()).isEqualTo("VERIFIED");
            assertThat(accepted.source()).isEqualTo("SYNTHETIC_MANUAL");
            assertThat(accepted.version()).isEqualTo(1);
            assertThatThrownBy(() -> RegistrationDecisions.apply(category, "SUBMITTED", 0, 0, verified(true)))
                    .isInstanceOf(ApiFailure.class);
        }
        var penjaga = RegistrationDecisions.apply("PENJAGA", "SUBMITTED", 0, 0, verified(true));
        assertThat(penjaga.basisCodes()).containsExactly("IDENTITY_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED", "WARD_MATCH_CONFIRMED");
        assertThatThrownBy(() -> penjaga.basisCodes().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> RegistrationDecisions.apply("PENJAGA", "SUBMITTED", 0, 0, verified(false)))
                .isInstanceOf(ApiFailure.class);
    }

    /** A mock feedback label is never sufficient evidence for the root's VERIFIED transition. */
    @Test void mockDoesNotApproveAndReasonCodesAreCategoryScoped() {
        var mock = new RegistrationReviewPort.Verified(true, true, true, new ManualEvidence("MATCH",
                List.of("IDENTITY_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED", "WARD_MATCH_CONFIRMED")));
        assertThatThrownBy(() -> RegistrationDecisions.apply("PENJAGA", "SUBMITTED", 0, 0, mock)).isInstanceOf(ApiFailure.class);
        var rejected = RegistrationDecisions.apply("PENJAGA", "SUBMITTED", 3, 3,
                new RegistrationReviewPort.Rejected("MRN_WARD_NOT_CONFIRMED"));
        assertThat(rejected.status()).isEqualTo("REJECTED");
        assertThat(rejected.source()).isEqualTo("LOCAL");
        assertThat(rejected.methodCode()).isNull();
        assertThat(rejected.basisCodes()).isEmpty();
        assertThatThrownBy(() -> RegistrationDecisions.apply("VENDOR", "SUBMITTED", 0, 0,
                new RegistrationReviewPort.Rejected("MRN_WARD_NOT_CONFIRMED"))).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> RegistrationDecisions.apply("VENDOR", "SUBMITTED", 0, 0,
                new RegistrationReviewPort.Rejected("patient text"))).isInstanceOfSatisfying(ApiFailure.class,
                failure -> assertThat(failure.getMessage()).doesNotContain("patient text"));
    }

    /** New decisions reject stale/terminal versions; successful replay belongs to the caller and runs first. */
    @Test void stateAndVersionConflictsCannotReapplyOrWrap() {
        for (String state : List.of("VERIFIED", "REJECTED", "CANCELLED")) {
            assertThatThrownBy(() -> RegistrationDecisions.apply("PENJAGA", state, 1, 0, verified(true)))
                    .isInstanceOfSatisfying(ApiFailure.class, failure -> assertThat(failure.code()).isEqualTo("REGISTRATION_STATE_CONFLICT"));
        }
        assertThatThrownBy(() -> RegistrationDecisions.apply("PENJAGA", "SUBMITTED", 1, 0, verified(true)))
                .isInstanceOfSatisfying(ApiFailure.class, failure -> assertThat(failure.code()).isEqualTo("VERSION_CONFLICT"));
        assertThatThrownBy(() -> RegistrationDecisions.apply("PENJAGA", "SUBMITTED", RegistrationVersions.MAX_SAFE,
                RegistrationVersions.MAX_SAFE, verified(true))).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> RegistrationDecisions.apply("PENJAGA", "SUBMITTED", 0, -1, verified(true))).isInstanceOf(ApiFailure.class);
    }

    /** Fixture decisions contain only the exact allowlisted attestation set. */
    private static RegistrationReviewPort.Verified verified(boolean penjaga) {
        return new RegistrationReviewPort.Verified(true, penjaga ? true : null, penjaga ? true : null,
                new ManualEvidence("SYNTHETIC_RECORD_COMPARISON", penjaga
                        ? List.of("WARD_MATCH_CONFIRMED", "IDENTITY_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED")
                        : List.of("IDENTITY_MATCH_CONFIRMED")));
    }
}
