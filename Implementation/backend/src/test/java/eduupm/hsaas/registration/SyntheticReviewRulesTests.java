package eduupm.hsaas.registration;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import eduupm.hsaas.common.ApiFailure;
import static org.assertj.core.api.Assertions.*;

/** Exercises the evidence boundary independently of future M04 transport and unapproved hospital policy. */
class SyntheticReviewRulesTests {
    private static final String METHOD = "SYNTHETIC_RECORD_COMPARISON";
    private static final List<String> COMPLETE = List.of("WARD_MATCH_CONFIRMED", "IDENTITY_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED");

    /** Staff evidence may have any set ordering, but requires all three Penjaga confirmations. */
    @Test void requiresAllPenjagaAttestations() {
        SyntheticReviewRules.verify(true, true, true, true, new ManualEvidence(METHOD, COMPLETE));
        for (int absent = 0; absent < 3; absent++) {
            var basis = new ArrayList<>(COMPLETE);
            basis.remove(absent);
            assertThatThrownBy(() -> SyntheticReviewRules.verify(true, true, true, true,
                    new ManualEvidence(METHOD, basis))).isInstanceOf(ApiFailure.class);
        }
        assertThatThrownBy(() -> SyntheticReviewRules.verify(true, true, false, true,
                new ManualEvidence(METHOD, COMPLETE))).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> SyntheticReviewRules.verify(true, true, true, null,
                new ManualEvidence(METHOD, COMPLETE))).isInstanceOf(ApiFailure.class);
    }

    /** A successful external/mock check cannot be passed off as a staff manual-comparison method. */
    @Test void rejectsMockMatchingDuplicateAndUnknownEvidenceWithoutEchoingValues() {
        for (String method : List.of("MATCH", "SYNTHETIC_MOCK", "LIVE", "untrusted patient text")) {
            assertThat(new ManualEvidence(method, COMPLETE).toString()).doesNotContain(method);
            assertThatThrownBy(() -> SyntheticReviewRules.verify(true, true, true, true,
                    new ManualEvidence(method, COMPLETE))).isInstanceOfSatisfying(ApiFailure.class,
                    failure -> assertThat(failure.getMessage()).doesNotContain(method));
        }
        assertThatThrownBy(() -> SyntheticReviewRules.verify(true, true, true, true,
                new ManualEvidence(METHOD, List.of("IDENTITY_MATCH_CONFIRMED", "IDENTITY_MATCH_CONFIRMED", "WARD_MATCH_CONFIRMED"))))
                .isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> SyntheticReviewRules.verify(true, true, true, true,
                new ManualEvidence(METHOD, List.of("IDENTITY_MATCH_CONFIRMED", "PATIENT_DETAIL", "WARD_MATCH_CONFIRMED"))))
                .isInstanceOf(ApiFailure.class);
    }

    /** Non-Penjaga review is identity-only and rejects all MRN/ward injection, including false values. */
    @Test void refusesCrossCategoryAttestations() {
        var identity = new ManualEvidence(METHOD, List.of("IDENTITY_MATCH_CONFIRMED"));
        SyntheticReviewRules.verify(false, true, null, null, identity);
        assertThatThrownBy(() -> SyntheticReviewRules.verify(false, true, false, null, identity)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> SyntheticReviewRules.verify(false, true, null, false, identity)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> SyntheticReviewRules.verify(false, true, null, null, new ManualEvidence(METHOD, COMPLETE)))
                .isInstanceOf(ApiFailure.class);
    }

    /** Snapshot evidence cannot change after validation through a retained caller list. */
    @Test void snapshotsMutableInputAndRejectsMissingOrMalformedValues() {
        var list = new ArrayList<>(COMPLETE);
        var evidence = new ManualEvidence(METHOD, list);
        list.clear();
        SyntheticReviewRules.verify(true, true, true, true, evidence);
        assertThatThrownBy(() -> evidence.basisCodes().clear()).isInstanceOf(UnsupportedOperationException.class);
        var nullValue = new ArrayList<>(COMPLETE);
        nullValue.set(0, null);
        assertThatThrownBy(() -> SyntheticReviewRules.verify(true, true, true, true,
                new ManualEvidence(METHOD, nullValue))).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> SyntheticReviewRules.verify(true, true, true, true, null)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> SyntheticReviewRules.verify(false, false, null, null,
                new ManualEvidence(METHOD, List.of("IDENTITY_MATCH_CONFIRMED")))).isInstanceOf(ApiFailure.class);
    }
}
