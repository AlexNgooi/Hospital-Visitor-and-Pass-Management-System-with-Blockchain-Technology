package eduupm.hsaas.registration;

import java.text.Normalizer;
import java.util.*;
import tools.jackson.databind.JsonNode;
import eduupm.hsaas.common.ApiFailure;

/** Versioned C14 synthetic whitelist; it does not implement or claim future hospital IC/MRN policy. */
public final class RegistrationFields {
    public static final String VERSION = "synthetic-registration-v1";
    public static final String PRIVACY_VERSION = "synthetic-privacy-v1";
    public static final String PRIVACY_TEXT = "Saya mengakui telah membaca notis demo ini. Gunakan data sintetik sahaja. "
            + "Maklumat digunakan untuk pendaftaran dan pengesahan simulasi di kaunter; jangan masukkan maklumat pesakit sebenar.";
    public static final Set<String> CATEGORIES = Set.of("EXECUTIVE", "PENJAGA", "VENDOR", "CONTRACTOR");
    public static final List<String> ALL_FIELDS = List.of("fullName", "identificationType", "identificationNumber", "phone",
            "mrn", "wardCode", "relationship", "organisation", "company", "contactPerson", "destinationCode",
            "visitPurpose", "deliveryPurpose", "workPurpose");
    private RegistrationFields() { }

    /** The same definitions drive server validation and the UI metadata; fields never come from caller configuration. */
    public static List<FieldSpec> fields(String category) {
        if (category == null || !CATEGORIES.contains(category)) { throw invalid("categoryCode"); }
        var fields = new ArrayList<>(List.of(
                field("fullName", "Nama penuh", "TEXT", 100, "TEXT", "Gunakan nama rekaan.", List.of()),
                field("identificationType", "Jenis pengenalan", "SELECT", 7, "ENUM", "", List.of(new Option("TEST_ID", "ID demo"))),
                field("identificationNumber", "No. pengenalan demo", "TEXT", 29, "DEMO_ID", "DEMO- diikuti 4–24 huruf besar atau nombor.", List.of()),
                field("phone", "No. telefon demo", "PHONE", 16, "PHONE", "Gunakan nombor sintetik sahaja. Tiada mesej dihantar.", List.of())));
        if (category.equals("PENJAGA")) {
            fields.add(field("mrn", "MRN demo", "TEXT", 25, "DEMO_MRN", "DEMO-MRN- diikuti 4–16 huruf besar atau nombor.", List.of()));
            fields.add(field("wardCode", "Wad", "DESTINATION", 32, "REFERENCE", "", List.of()));
            fields.add(field("relationship", "Hubungan dengan pesakit", "SELECT", 16, "ENUM", "", List.of(
                    new Option("PARENT", "Ibu / bapa"), new Option("SPOUSE", "Pasangan"), new Option("SIBLING", "Adik-beradik"),
                    new Option("CHILD", "Anak"), new Option("OTHER", "Lain-lain"))));
        } else {
            fields.add(field(category.equals("EXECUTIVE") ? "organisation" : "company",
                    category.equals("EXECUTIVE") ? "Organisasi" : "Syarikat", "TEXT", 120, "TEXT", "", List.of()));
            fields.add(field("contactPerson", "Pegawai dihubungi", "TEXT", 100, "TEXT", "Gunakan nama rekaan.", List.of()));
            fields.add(field("destinationCode", category.equals("CONTRACTOR") ? "Lokasi kerja" : "Jabatan / lokasi",
                    "DESTINATION", 32, "REFERENCE", "", List.of()));
            String purpose = category.equals("EXECUTIVE") ? "visitPurpose" : category.equals("VENDOR") ? "deliveryPurpose" : "workPurpose";
            fields.add(field(purpose, category.equals("EXECUTIVE") ? "Tujuan lawatan" : category.equals("VENDOR") ? "Tujuan penghantaran" : "Tujuan kerja",
                    "TEXT", 500, "TEXT", "Jangan masukkan maklumat pesakit.", List.of()));
        }
        return List.copyOf(fields);
    }

    /** Rejects every unknown/cross-category field and never silently truncates or coerces user input. */
    public static Map<String, String> validate(String category, JsonNode input) {
        var definitions = fields(category);
        if (input == null || !input.isObject()) { throw invalid("formData"); }
        var allowed = definitions.stream().map(FieldSpec::name).collect(java.util.stream.Collectors.toSet());
        if (input.properties().stream().anyMatch(property -> !allowed.contains(property.getKey()))) { throw invalid("formData"); }
        var output = new LinkedHashMap<String, String>();
        var errors = new ArrayList<ApiFailure.FieldError>();
        for (var field : definitions) {
            try {
                var node = input.path(field.name());
                if (!node.isString()) { throw invalid("formData." + field.name()); }
                String value = normalized(node.asString(), field.maxLength(), "formData." + field.name());
                boolean valid = switch (field.rule()) {
                    case "DEMO_ID" -> value.matches("DEMO-[A-Z0-9]{4,24}");
                    case "DEMO_MRN" -> value.matches("DEMO-MRN-[A-Z0-9]{4,16}");
                    case "PHONE" -> value.matches("\\+[0-9]{8,15}");
                    case "REFERENCE" -> selectableCode(value);
                    case "ENUM" -> field.options().stream().anyMatch(option -> option.value().equals(value));
                    default -> true;
                };
                if (!valid) { throw invalid("formData." + field.name()); }
                output.put(field.name(), value);
            } catch (ApiFailure failure) { errors.addAll(failure.fields()); }
        }
        if (!errors.isEmpty()) { throw new ApiFailure(400, "VALIDATION_FAILED", "Check the registration fields.", errors); }
        return Collections.unmodifiableMap(output);
    }

    /** Persisted normalization is explicit in this schema; the request HMAC uses original parsed values instead. */
    public static String normalized(String value, int max, String field) {
        // The transport bounds raw text; decomposed Unicode can be much longer than its accepted NFC codepoint count.
        if (value == null || value.length() > 8192) { throw invalid(field); }
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            if (Character.isHighSurrogate(character)) {
                if (++index >= value.length() || !Character.isLowSurrogate(value.charAt(index))) { throw invalid(field); }
            } else if (Character.isLowSurrogate(character)) { throw invalid(field); }
        }
        // Reject controls in original input before strip can erase a leading/trailing tab or newline.
        if (value.codePoints().anyMatch(character -> Character.isISOControl(character)
                || Character.getType(character) == Character.FORMAT)) { throw invalid(field); }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFC).strip();
        int length = normalized.codePointCount(0, normalized.length());
        if (length < 1 || length > max || normalized.codePoints().anyMatch(character ->
                Character.isISOControl(character) || Character.getType(character) == Character.FORMAT)) { throw invalid(field); }
        return normalized;
    }

    /** The schema only presents catalogue codes which it can later accept, even though V1 allows longer codes. */
    public static boolean selectableCode(String value) { return value != null && value.matches("[A-Za-z0-9_-]{1,32}"); }
    public static ApiFailure invalid(String field) {
        return new ApiFailure(400, "VALIDATION_FAILED", "Check the registration fields.",
                List.of(new ApiFailure.FieldError(field, "INVALID", "Semak maklumat ini.")));
    }
    private static FieldSpec field(String name, String label, String kind, int max, String rule, String hint, List<Option> options) {
        return new FieldSpec(name, label, kind, max, rule, hint, List.copyOf(options));
    }
    /** Static public metadata contains no visitor data or authorization. */
    public record FieldSpec(String name, String label, String kind, int maxLength, String rule, String hint, List<Option> options) { }
    public record Option(String value, String label) { }
}
