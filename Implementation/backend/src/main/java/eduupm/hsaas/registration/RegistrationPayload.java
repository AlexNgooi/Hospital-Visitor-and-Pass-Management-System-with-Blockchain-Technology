package eduupm.hsaas.registration;

import java.util.*;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.common.RequestEncoding;
import eduupm.hsaas.common.RestartDetails.FormContext;

/** Strict parsed command snapshots preserve original strings, missing/null semantics and the original form binding. */
public final class RegistrationPayload {
    private RegistrationPayload() { }

    /** Parses shape without current policy checks so a retained successful replay is not blocked by later policy changes. */
    public static Parsed submission(JsonMapper json, String body) {
        JsonNode input = parse(json, body);
        allowed(input, Set.of("formContext", "categoryCode", "fieldSchemaVersion", "formData", "privacyAcknowledgement", "mrnValidationToken"));
        var context = context(input.path("formContext"));
        var form = input.path("formData");
        allowed(form, new HashSet<>(RegistrationFields.ALL_FIELDS));
        allowed(input.path("privacyAcknowledgement"), Set.of("acknowledged", "policyVersion"));
        String category = text(input.path("categoryCode"), "categoryCode", 16);
        String version = text(input.path("fieldSchemaVersion"), "fieldSchemaVersion", 64);
        return new Parsed(input, context, category, version);
    }

    /** Reads schema/MRN requests with explicit current context; cookie sharing cannot rebind an old form. */
    public static JsonNode request(JsonMapper json, String body, Set<String> fields) {
        var input = parse(json, body); allowed(input, fields); context(input.path("formContext")); return input;
    }

    public static FormContext context(JsonNode input) {
        allowed(input, Set.of("grantReference", "bindingVersion"));
        String reference = text(input.path("grantReference"), "formContext", 128);
        var version = input.path("bindingVersion");
        if (!version.isIntegralNumber() || !version.canConvertToLong()) { throw RegistrationFields.invalid("formContext"); }
        long value = RegistrationVersions.checked(version.asLong());
        try { return new FormContext(reference, value); }
        catch (IllegalArgumentException failure) { throw RegistrationFields.invalid("formContext"); }
    }

    /** C11's fixed field order is independent of JSON property order and retains all business field presence. */
    public static byte[] encode(JsonMapper json, RequestEncoding.Scope scope, Parsed parsed) {
        var input = parsed.input();
        var fields = new ArrayList<RequestEncoding.Field>();
        fields.add(RequestEncoding.Field.object("formContext", List.of(
                RequestEncoding.Field.text("grantReference", parsed.context().grantReference()),
                RequestEncoding.Field.integer("bindingVersion", parsed.context().bindingVersion()))));
        fields.add(RequestEncoding.Field.text("categoryCode", parsed.category()));
        fields.add(RequestEncoding.Field.text("fieldSchemaVersion", parsed.schemaVersion()));
        var form = new ArrayList<RequestEncoding.Field>();
        for (String name : RegistrationFields.ALL_FIELDS) { form.add(stringField(input.path("formData"), name)); }
        fields.add(RequestEncoding.Field.object("formData", form));
        var privacy = input.path("privacyAcknowledgement");
        RequestEncoding.Field acknowledgement;
        if (!privacy.has("acknowledged")) { acknowledgement = RequestEncoding.Field.missing("acknowledged"); }
        else if (privacy.path("acknowledged").isNull()) { acknowledgement = RequestEncoding.Field.nil("acknowledged"); }
        else if (privacy.path("acknowledged").isBoolean()) { acknowledgement = RequestEncoding.Field.bool("acknowledged", privacy.path("acknowledged").asBoolean()); }
        else { throw RegistrationFields.invalid("privacyAcknowledgement"); }
        fields.add(RequestEncoding.Field.object("privacyAcknowledgement", List.of(acknowledgement, stringField(privacy, "policyVersion"))));
        fields.add(stringField(input, "mrnValidationToken"));
        return RequestEncoding.encode(json, scope, "SUBMIT", "REGISTER", 1, fields);
    }

    /** No record representation can emit raw form data into an exception or diagnostic. */
    public record Parsed(JsonNode input, FormContext context, String category, String schemaVersion) {
        @Override public String toString() { return "RegistrationPayload[REDACTED]"; }
    }

    public static String text(JsonNode value, String field, int max) {
        if (!value.isString() || value.asString().length() > max) { throw RegistrationFields.invalid(field); }
        return value.asString();
    }
    private static RequestEncoding.Field stringField(JsonNode input, String name) {
        if (!input.has(name)) { return RequestEncoding.Field.missing(name); }
        if (input.path(name).isNull()) { return RequestEncoding.Field.nil(name); }
        return RequestEncoding.Field.text(name, text(input.path(name), safeField(name), 8192));
    }
    private static String safeField(String name) {
        return RegistrationFields.ALL_FIELDS.contains(name) ? "formData." + name : name;
    }
    private static void allowed(JsonNode input, Set<String> names) {
        if (!input.isObject() || input.properties().stream().anyMatch(property -> !names.contains(property.getKey()))) {
            throw RegistrationFields.invalid("request");
        }
    }
    private static JsonNode parse(JsonMapper json, String body) {
        if (body == null || body.length() > 8192) { throw RegistrationFields.invalid("request"); }
        try { return json.readerFor(JsonNode.class).with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readValue(body); }
        catch (RuntimeException failure) { throw RegistrationFields.invalid("request"); }
    }
}
