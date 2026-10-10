package eduupm.hsaas.registration.review;

import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.common.RequestEncoding;
import eduupm.hsaas.config.FoundationConfig;
import eduupm.hsaas.registration.SyntheticReviewRules;
import static org.assertj.core.api.Assertions.*;

/** Exercises M04's HTTP shape/encoding boundary while calling the approved single M03 evidence validator. */
class ReviewCommandsTests {
    private final JsonMapper json = new FoundationConfig().jsonMapper();
    private final RequestEncoding.Scope staff = new RequestEncoding.Scope(RequestEncoding.Kind.USER, "7");
    private static final String EVIDENCE = "\"manualEvidence\":{\"methodCode\":\"SYNTHETIC_RECORD_COMPARISON\","
            + "\"basisCodes\":[\"IDENTITY_MATCH_CONFIRMED\",\"MRN_MATCH_CONFIRMED\",\"WARD_MATCH_CONFIRMED\"]}";
    private String penjaga() { return "{\"expectedVersion\":0,\"identityConfirmed\":true,\"mrnConfirmed\":true,\"wardConfirmed\":true," + EVIDENCE + "}"; }
    private String other() { return "{\"expectedVersion\":0,\"identityConfirmed\":true,\"manualEvidence\":{\"methodCode\":\"SYNTHETIC_RECORD_COMPARISON\",\"basisCodes\":[\"IDENTITY_MATCH_CONFIRMED\"]}}"; }
    private void invalid(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiFailure.class, failure -> {
            assertThat(failure.code()).isEqualTo("VALIDATION_FAILED"); assertThat(failure.status()).isEqualTo(400);
        });
    }
    /** Category-specific decisions use the imported root validator; no parallel review predicate is maintained. */
    private void rootVerify(boolean penjaga, ReviewCommands.Verify command) {
        var decision = command.decision();
        SyntheticReviewRules.verify(penjaga, decision.identityConfirmed(), decision.mrnConfirmed(), decision.wardConfirmed(), decision.manualEvidence());
    }

    @Test void parsedCompleteEvidenceMatchesRootContract() {
        var command = ReviewCommands.parseVerify(json, penjaga()); rootVerify(true, command);
        assertThat(command.decision().manualEvidence().methodCode()).isEqualTo("SYNTHETIC_RECORD_COMPARISON");
        assertThat(command.toString()).isEqualTo("Verify[REDACTED]");
        rootVerify(false, ReviewCommands.parseVerify(json, other()));
    }
    /** Mock status is not a command field and cannot substitute for a missing human confirmation. */
    @Test void rootStillRequiresIndependentStaffConfirmation() {
        for (String changed : List.of(penjaga().replace("\"mrnConfirmed\":true,", ""), penjaga().replace("\"mrnConfirmed\":true", "\"mrnConfirmed\":false"),
                penjaga().replace("\"identityConfirmed\":true", "\"identityConfirmed\":false"), penjaga().replace("\"wardConfirmed\":true", "\"wardConfirmed\":false"))) {
            invalid(() -> rootVerify(true, ReviewCommands.parseVerify(json, changed)));
        }
        invalid(() -> rootVerify(false, ReviewCommands.parseVerify(json, penjaga())));
    }
    /** Unknown methods/codes and duplicate entries cannot enter the root evidence boundary. */
    @Test void evidenceSetRejectsUnsupportedValues() {
        for (String changed : List.of(penjaga().replace("SYNTHETIC_RECORD_COMPARISON", "LIVE_HOSPITAL_API"),
                penjaga().replace("WARD_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED"), penjaga().replace("WARD_MATCH_CONFIRMED", "UNKNOWN_EVIDENCE"))) {
            invalid(() -> ReviewCommands.parseVerify(json, changed));
        }
        invalid(() -> rootVerify(true, ReviewCommands.parseVerify(json, penjaga().replace(",\"WARD_MATCH_CONFIRMED\"", ""))));
    }
    /** Server-owned metadata and unstructured notes are outside both the top-level and nested whitelists. */
    @Test void rejectsSensitiveExtensions() {
        for (String property : List.of("\"actorId\":7", "\"verifiedAt\":\"2026-10-09T00:00:00Z\"", "\"source\":\"SYNTHETIC_MANUAL\"",
                "\"safeNote\":\"synthetic-raw-input\"", "\"mrn\":\"synthetic-raw-input\"")) {
            invalid(() -> ReviewCommands.parseVerify(json, penjaga().replace("\"expectedVersion\":0,", "\"expectedVersion\":0," + property + ",")));
        }
        invalid(() -> ReviewCommands.parseVerify(json, penjaga().replace("\"methodCode\":", "\"note\":\"synthetic-raw-input\",\"methodCode\":")));
    }
    /** Duplicate keys fail before a second value can overwrite a version or attestation. */
    @Test void duplicateJsonKeysFailClosed() {
        invalid(() -> ReviewCommands.parseVerify(json, penjaga().replace("\"expectedVersion\":0,", "\"expectedVersion\":0,\"expectedVersion\":1,")));
        invalid(() -> ReviewCommands.parseVerify(json, penjaga().replace("\"methodCode\":", "\"methodCode\":\"SYNTHETIC_RECORD_COMPARISON\",\"methodCode\":")));
    }
    /** Versions remain exact integers; booleans cannot be null, strings, or numbers. */
    @Test void numericAndBooleanBoundariesAreStrict() {
        for (String value : List.of("null", "\"0\"", "0.0", "-1", "9007199254740992", "9223372036854775808")) {
            invalid(() -> ReviewCommands.parseVerify(json, penjaga().replace("\"expectedVersion\":0", "\"expectedVersion\":" + value)));
        }
        for (String value : List.of("null", "\"true\"", "1")) {
            invalid(() -> ReviewCommands.parseVerify(json, penjaga().replace("\"identityConfirmed\":true", "\"identityConfirmed\":" + value)));
        }
    }
    /** Parse failures return fixed diagnostics and do not echo any submitted data. */
    @Test void malformedInputHasSafeDiagnostics() {
        for (String value : List.of("null", "[]", "{", "synthetic-raw-input", " ".repeat(4097), penjaga() + "{}", penjaga() + " null")) {
            assertThatThrownBy(() -> ReviewCommands.parseVerify(json, value)).isInstanceOfSatisfying(ApiFailure.class,
                    failure -> assertThat(failure.getMessage()).doesNotContain("synthetic-raw-input"));
        }
    }
    /** This parser checks the C09 reason vocabulary; category and transition checks remain owned by the root adapter. */
    @Test void rejectionReasonShapeIsStrict() {
        for (String value : List.of("\"\"", "null", "\"UNKNOWN\"", "\" INFORMATION_INCOMPLETE \"")) {
            invalid(() -> ReviewCommands.parseReject(json, "{\"expectedVersion\":0,\"reasonCode\":" + value + "}"));
        }
        invalid(() -> ReviewCommands.parseReject(json, "{\"expectedVersion\":0,\"reasonCode\":\"INFORMATION_INCOMPLETE\",\"note\":\"synthetic-input\"}"));
        for (String reason : ReviewCommands.REASONS) {
            var command = ReviewCommands.parseReject(json, "{\"expectedVersion\":0,\"reasonCode\":\"" + reason + "\"}");
            assertThat(command.decision().reasonCode()).isEqualTo(reason); assertThat(command.toString()).isEqualTo("Reject[REDACTED]");
        }
    }
    /** basisCodes is a documented set; equivalent permutations encode identically while version changes do not. */
    @Test void canonicalVerifyEncoding() {
        var first = ReviewCommands.parseVerify(json, penjaga());
        String reordered = penjaga().replace("\"IDENTITY_MATCH_CONFIRMED\",\"MRN_MATCH_CONFIRMED\",\"WARD_MATCH_CONFIRMED\"",
                "\"WARD_MATCH_CONFIRMED\",\"IDENTITY_MATCH_CONFIRMED\",\"MRN_MATCH_CONFIRMED\"");
        assertThat(ReviewCommands.encodeVerify(json, staff, "12", first)).isEqualTo(
                ReviewCommands.encodeVerify(json, staff, "12", ReviewCommands.parseVerify(json, reordered)));
        assertThat(ReviewCommands.encodeVerify(json, staff, "12", first)).isNotEqualTo(
                ReviewCommands.encodeVerify(json, staff, "12", ReviewCommands.parseVerify(json, penjaga().replace("\"expectedVersion\":0", "\"expectedVersion\":1"))));
    }
    /** Optional missing fields encode as MISSING; explicit null is rejected, and target is part of the namespace. */
    @Test void encodingPreservesPresenceAndTarget() {
        var command = ReviewCommands.parseVerify(json, other());
        String encoding = new String(ReviewCommands.encodeVerify(json, staff, "12", command), StandardCharsets.UTF_8);
        assertThat(encoding).contains("[\"mrnConfirmed\",\"MISSING\"]", "[\"wardConfirmed\",\"MISSING\"]");
        assertThat(ReviewCommands.encodeVerify(json, staff, "12", command)).isNotEqualTo(ReviewCommands.encodeVerify(json, staff, "13", command));
        invalid(() -> ReviewCommands.parseVerify(json, other().replace("\"identityConfirmed\":true,", "\"identityConfirmed\":true,\"mrnConfirmed\":null,")));
    }
    /** A fixed golden vector checks C11 encoding independently of raw JSON property order. */
    @Test void rejectionEncodingGoldenVector() {
        byte[] encoded = ReviewCommands.encodeReject(json, staff, "12", new ReviewCommands.Reject(0, "INFORMATION_INCOMPLETE"));
        assertThat(new String(encoded, StandardCharsets.UTF_8)).isEqualTo(
                "[\"HSAAS_REQUEST\",1,\"USER\",\"7\",\"REJECT\",\"12\",1,[[\"expectedVersion\",\"VALUE\",\"INTEGER\",\"0\"],[\"reasonCode\",\"VALUE\",\"STRING\",\"INFORMATION_INCOMPLETE\"]]]");
    }
}
