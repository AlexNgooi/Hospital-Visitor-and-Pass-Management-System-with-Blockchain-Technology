package eduupm.hsaas.registration.review;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.common.RequestEncoding;
import eduupm.hsaas.registration.ManualEvidence;
import eduupm.hsaas.registration.RegistrationReviewPort;
import eduupm.hsaas.registration.RegistrationVersions;

/** Strict C09 commands preserve field presence for C11 hashes and never accept caller-owned audit metadata. */
public final class ReviewCommands {
    public static final long MAX_VERSION = RegistrationVersions.MAX_SAFE;
    public static final String METHOD = "SYNTHETIC_RECORD_COMPARISON";
    public static final String IDENTITY = "IDENTITY_MATCH_CONFIRMED";
    public static final String MRN = "MRN_MATCH_CONFIRMED";
    public static final String WARD = "WARD_MATCH_CONFIRMED";
    public static final Set<String> BASIS = Set.of(IDENTITY, MRN, WARD);
    public static final Set<String> REASONS = Set.of("INFORMATION_INCOMPLETE", "IDENTITY_NOT_CONFIRMED",
            "MRN_WARD_NOT_CONFIRMED", "INFORMATION_NOT_CONFIRMED");
    private ReviewCommands() { }

    /** The shared strict mapper rejects duplicate properties; this domain additionally rejects unknown nested fields. */
    public static Verify parseVerify(JsonMapper json, String body) {
        JsonNode input = parse(json, body);
        fields(input, Set.of("expectedVersion", "identityConfirmed", "mrnConfirmed", "wardConfirmed", "manualEvidence"));
        JsonNode evidence = input.path("manualEvidence");
        fields(evidence, Set.of("methodCode", "basisCodes"));
        String method = text(evidence.path("methodCode"), "manualEvidence.methodCode");
        if (!METHOD.equals(method)) throw invalid("manualEvidence.methodCode");
        JsonNode bases = evidence.path("basisCodes");
        if (!bases.isArray() || bases.size() < 1 || bases.size() > 3) throw invalid("manualEvidence.basisCodes");
        var codes = new ArrayList<String>();
        for (JsonNode value : bases) {
            String code = text(value, "manualEvidence.basisCodes");
            if (!BASIS.contains(code) || codes.contains(code)) throw invalid("manualEvidence.basisCodes");
            codes.add(code);
        }
        return new Verify(version(input.path("expectedVersion")), confirmed(input.path("identityConfirmed"), "identityConfirmed"),
                optionalConfirmation(input, "mrnConfirmed"), optionalConfirmation(input, "wardConfirmed"), new ManualEvidence(method, codes));
    }

    /** Rejection uses a required allowlisted reason, without note/PII or arbitrary status changes. */
    public static Reject parseReject(JsonMapper json, String body) {
        JsonNode input = parse(json, body);
        fields(input, Set.of("expectedVersion", "reasonCode"));
        String reason = text(input.path("reasonCode"), "reasonCode");
        if (!REASONS.contains(reason)) throw invalid("reasonCode");
        return new Reject(version(input.path("expectedVersion")), reason);
    }

    /** Fixed DTO field order makes JSON property order irrelevant; basisCodes is explicitly a set. */
    public static byte[] encodeVerify(JsonMapper json, RequestEncoding.Scope scope, String target, Verify command) {
        return RequestEncoding.encode(json, scope, "VERIFY", target, 1, List.of(
                RequestEncoding.Field.integer("expectedVersion", command.expectedVersion()),
                RequestEncoding.Field.bool("identityConfirmed", command.identityConfirmed()),
                confirmationField("mrnConfirmed", command.mrnConfirmed()),
                confirmationField("wardConfirmed", command.wardConfirmed()),
                RequestEncoding.Field.object("manualEvidence", List.of(
                        RequestEncoding.Field.text("methodCode", command.manualEvidence().methodCode()),
                        RequestEncoding.Field.enumSet("basisCodes", command.manualEvidence().basisCodes())))));
    }

    /** Command input is encoded before state checks so successful replay can retain its original version. */
    public static byte[] encodeReject(JsonMapper json, RequestEncoding.Scope scope, String target, Reject command) {
        return RequestEncoding.encode(json, scope, "REJECT", target, 1, List.of(
                RequestEncoding.Field.integer("expectedVersion", command.expectedVersion()),
                RequestEncoding.Field.text("reasonCode", command.reasonCode())));
    }

    /** Omitted optional confirmations stay omitted; null and scalar coercion are rejected rather than normalized. */
    private static Boolean optionalConfirmation(JsonNode input, String name) {
        return input.has(name) ? confirmed(input.path(name), name) : null;
    }
    private static RequestEncoding.Field confirmationField(String name, Boolean value) {
        return value == null ? RequestEncoding.Field.missing(name) : RequestEncoding.Field.bool(name, value);
    }

    /** Limits wire versions to integers representable in both Java and JavaScript. */
    private static long version(JsonNode value) {
        if (!value.isIntegralNumber() || !value.canConvertToLong()) throw invalid("expectedVersion");
        long version = value.asLong();
        if (version < 0 || version > MAX_VERSION) throw invalid("expectedVersion");
        return version;
    }
    private static boolean confirmed(JsonNode value, String field) {
        if (!value.isBoolean()) throw invalid(field);
        return value.asBoolean();
    }
    private static String text(JsonNode value, String field) {
        if (!value.isString() || !value.asString().matches("[A-Z_]{1,64}")) throw invalid(field);
        return value.asString();
    }
    private static void fields(JsonNode value, Set<String> allowed) {
        if (!value.isObject()) throw invalid("request");
        var names = new HashSet<String>();
        value.properties().forEach(entry -> names.add(entry.getKey()));
        if (!allowed.containsAll(names)) throw invalid("request");
    }

    /** Parsing failures expose only safe field names, never submitted body or exception details. */
    private static JsonNode parse(JsonMapper json, String body) {
        if (body == null || body.length() > 4096) throw invalid("request");
        try { return json.readerFor(JsonNode.class).with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readValue(body); }
        catch (RuntimeException malformed) { throw invalid("request"); }
    }
    public static ApiFailure invalid(String field) {
        return new ApiFailure(400, "VALIDATION_FAILED", "Check the review fields.",
                List.of(new ApiFailure.FieldError(field, "INVALID", "Check this review field.")));
    }

    /** Null optional confirmations mean absent properties, not accepted JSON null values. */
    public record Verify(long expectedVersion, boolean identityConfirmed, Boolean mrnConfirmed,
            Boolean wardConfirmed, ManualEvidence manualEvidence) {
        /** The M03 root uses its single authoritative C09 validator when recording this typed decision. */
        public RegistrationReviewPort.Verified decision() {
            return new RegistrationReviewPort.Verified(identityConfirmed, mrnConfirmed, wardConfirmed, manualEvidence);
        }
        @Override public String toString() { return "Verify[REDACTED]"; }
    }
    /** The rejection DTO cannot carry visitor contact information or a destination chosen by the caller. */
    public record Reject(long expectedVersion, String reasonCode) {
        public RegistrationReviewPort.Rejected decision() { return new RegistrationReviewPort.Rejected(reasonCode); }
        @Override public String toString() { return "Reject[REDACTED]"; }
    }
}
