package eduupm.hsaas.registration;

import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.common.RequestEncoding;
import eduupm.hsaas.config.FoundationConfig;
import static org.assertj.core.api.Assertions.*;

/** Four synthetic white lists, Unicode/control boundaries and original-presence encoding share the actual production rules. */
class RegistrationFieldTests {
    private final JsonMapper json = new FoundationConfig().jsonMapper();
    private static final RequestEncoding.Scope SCOPE = new RequestEncoding.Scope(RequestEncoding.Kind.ANONYMOUS, "83d9aee1-d735-4f06-a427-7d20af856947");

    /** Each category accepts its own required fields and rejects another category's fields or unknown opt-in. */
    @Test void fourCategoriesValidateAndRejectCrossCategoryOrMissingFields() {
        for (String category : RegistrationFields.CATEGORIES) {
            var fields = valid(category);
            assertThat(RegistrationFields.validate(category, json.readTree(json.writeValueAsString(fields)))).containsEntry("identificationType", "TEST_ID");
            fields.put("patientName", "Must not be collected");
            assertThatThrownBy(() -> RegistrationFields.validate(category, json.readTree(json.writeValueAsString(fields)))).isInstanceOf(ApiFailure.class);
            fields.remove("patientName"); fields.remove("phone");
            assertThatThrownBy(() -> RegistrationFields.validate(category, json.readTree(json.writeValueAsString(fields)))).isInstanceOf(ApiFailure.class);
        }
        var vendor = valid("VENDOR"); vendor.put("mrn", "DEMO-MRN-4821");
        assertThatThrownBy(() -> RegistrationFields.validate("VENDOR", json.readTree(json.writeValueAsString(vendor)))).isInstanceOf(ApiFailure.class);
    }

    /** Boundaries count Unicode code points after NFC, and ID/MRN/phone shapes never claim formal hospital formats. */
    @Test void lengthAndSyntheticPatternsAreExact() {
        var form = valid("PENJAGA");
        form.put("fullName", "李".repeat(100)); form.put("identificationNumber", "DEMO-" + "A".repeat(24));
        form.put("mrn", "DEMO-MRN-" + "A".repeat(16)); form.put("phone", "+" + "9".repeat(15));
        RegistrationFields.validate("PENJAGA", json.readTree(json.writeValueAsString(form)));
        for (String field : List.of("fullName", "identificationNumber", "mrn", "phone")) {
            var copy = new LinkedHashMap<>(form); copy.put(field, copy.get(field) + "A");
            assertThatThrownBy(() -> RegistrationFields.validate("PENJAGA", json.readTree(json.writeValueAsString(copy))))
                    .isInstanceOf(ApiFailure.class);
        }
        var wrong = valid("PENJAGA"); wrong.put("identificationType", "IC");
        assertThatThrownBy(() -> RegistrationFields.validate("PENJAGA", json.readTree(json.writeValueAsString(wrong)))).isInstanceOf(ApiFailure.class);
        wrong.put("identificationType", "TEST_ID"); wrong.put("mrn", "4821");
        assertThatThrownBy(() -> RegistrationFields.validate("PENJAGA", json.readTree(json.writeValueAsString(wrong)))).isInstanceOf(ApiFailure.class);
    }

    /** Printable surrounding spaces normalize, but original leading/trailing/interior controls always fail. */
    @Test void originalControlsCannotDisappearDuringTrimming() {
        assertThat(RegistrationFields.normalized("  Demo Visitor  ", 100, "formData.fullName")).isEqualTo("Demo Visitor");
        assertThat(RegistrationFields.normalized("Jose\u0301", 100, "formData.fullName")).isEqualTo("José");
        for (String value : List.of("\nDemo", "Demo\n", "\tDemo", "Demo\t", "De\nmo", "\u202eDemo", "    ", "\uD800")) {
            assertThatThrownBy(() -> RegistrationFields.normalized(value, 100, "formData.fullName")).isInstanceOf(ApiFailure.class);
        }
    }

    /** A raw decomposed name must retain the approved NFC codepoint range, while its original hash remains distinct. */
    @Test void decomposedNfcBoundaryAndOriginalHash() {
        String decomposed = "a\u0306\u0301".repeat(100), composed = "ắ".repeat(100);
        assertThat(RegistrationFields.normalized(decomposed,100,"formData.fullName")).isEqualTo(composed);
        assertThatThrownBy(()->RegistrationFields.normalized(decomposed+"a\u0306\u0301",100,"formData.fullName")).isInstanceOf(ApiFailure.class);
        var first = submission("PENJAGA");var second = submission("PENJAGA");
        var firstForm = valid("PENJAGA");firstForm.put("fullName",decomposed);first.put("formData",firstForm);
        var secondForm = valid("PENJAGA");secondForm.put("fullName",composed);second.put("formData",secondForm);
        assertThat(encoding(first)).isNotEqualTo(encoding(second));
        assertThat(RegistrationFields.validate("PENJAGA",json.readTree(json.writeValueAsString(firstForm))))
                .isEqualTo(RegistrationFields.validate("PENJAGA",json.readTree(json.writeValueAsString(secondForm))));
    }

    /** Parsed JSON ordering/escaping is semantic, but normalized persistence does not erase a changed body's original strings. */
    @Test void hashEncodingPreservesOriginalStringsContextAndMissingNull() {
        var body = submission("PENJAGA");
        byte[] original = encoding(body);
        var missing = new LinkedHashMap<>(body); missing.put("mrnValidationToken", null);
        assertThat(encoding(missing)).isNotEqualTo(original);
        var changed = new LinkedHashMap<>(body); var form = new LinkedHashMap<>(valid("PENJAGA"));
        form.put("fullName", " Demo Visitor "); changed.put("formData", form);
        assertThat(RegistrationFields.validate("PENJAGA", json.readTree(json.writeValueAsString(form)))).isEqualTo(valid("PENJAGA"));
        assertThat(encoding(changed)).isNotEqualTo(original);
        var reordered = new TreeMap<>(body);
        assertThat(encoding(reordered)).isEqualTo(original);
        var newContext = new LinkedHashMap<>(body); newContext.put("formContext", Map.of("grantReference", "another-grant", "bindingVersion", 2));
        assertThat(encoding(newContext)).isNotEqualTo(original);
    }

    /** Strict transport rejects duplicate/unknown/trailing data and scalar coercion before any business writes. */
    @Test void malformedTransportDoesNotProduceEncoding() {
        String body = json.writeValueAsString(submission("VENDOR"));
        assertThatThrownBy(() -> RegistrationPayload.submission(json, body + "{}")).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> RegistrationPayload.submission(json, body.replace("\"categoryCode\":\"VENDOR\"", "\"categoryCode\":\"VENDOR\",\"categoryCode\":\"VENDOR\"")))
                .isInstanceOf(ApiFailure.class);
        var unknown = new LinkedHashMap<>(submission("VENDOR")); unknown.put("whatsappOptIn", true);
        assertThatThrownBy(() -> encoding(unknown)).isInstanceOf(ApiFailure.class);
        var wrong = new LinkedHashMap<>(submission("VENDOR")); wrong.put("formContext", Map.of("grantReference", "test", "bindingVersion", "1"));
        assertThatThrownBy(() -> encoding(wrong)).isInstanceOf(ApiFailure.class);
    }

    private byte[] encoding(Map<String, Object> body) { return RegistrationPayload.encode(json, SCOPE, RegistrationPayload.submission(json, json.writeValueAsString(body))); }
    /** Only visibly synthetic fixtures are used; no real phone/MRN/account or external provider is involved. */
    static Map<String, String> valid(String category) {
        var fields = new LinkedHashMap<String, String>();
        fields.put("fullName", "Demo Visitor"); fields.put("identificationType", "TEST_ID"); fields.put("identificationNumber", "DEMO-ABCD"); fields.put("phone", "+999123456789");
        if (category.equals("PENJAGA")) { fields.put("mrn", "DEMO-MRN-4821"); fields.put("wardCode", "DEMO_WARD_A"); fields.put("relationship", "PARENT"); }
        else {
            fields.put(category.equals("EXECUTIVE") ? "organisation" : "company", "Demo Organisation");
            fields.put("contactPerson", "Demo Contact"); fields.put("destinationCode", "DEMO_LOCATION_A");
            fields.put(category.equals("EXECUTIVE") ? "visitPurpose" : category.equals("VENDOR") ? "deliveryPurpose" : "workPurpose", "Synthetic demo visit");
        }
        return fields;
    }
    static Map<String, Object> submission(String category) {
        var body = new LinkedHashMap<String, Object>();
        body.put("formContext", Map.of("grantReference", "90b179fa-c6ae-4e52-a8d8-dc09c732e4c2", "bindingVersion", 1));
        body.put("categoryCode", category); body.put("fieldSchemaVersion", RegistrationFields.VERSION); body.put("formData", valid(category));
        body.put("privacyAcknowledgement", Map.of("acknowledged", true, "policyVersion", RegistrationFields.PRIVACY_VERSION));
        return body;
    }
}
