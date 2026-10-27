package eduupm.hsaas.registration;

import java.text.Normalizer;
import java.util.*;
import tools.jackson.databind.JsonNode;
import eduupm.hsaas.common.ApiFailure;

/** Versioned manual forms retain legacy history while collecting only the current approved synthetic fields. */
public final class RegistrationFields {
    public static final String LEGACY_VERSION = "synthetic-registration-v1";
    public static final String VERSION = "manual-registration-v2";
    public static final String TERMS_VERSION = "penjaga-pass-terms-v1";
    public static final String TERMS_TEXT = "Saya bersetuju menjaga kad akses penjaga, menggunakannya hanya untuk lawatan yang dibenarkan, "
            + "dan memulangkannya kepada kakitangan selepas digunakan. Pengesahan kakitangan diperlukan sebelum kad dikeluarkan.";
    public static final String PRIVACY_VERSION = "synthetic-privacy-v1";
    public static final String PRIVACY_TEXT = "Saya mengakui telah membaca notis demo ini. Gunakan data sintetik sahaja. "
            + "Maklumat digunakan untuk pendaftaran dan pengesahan simulasi di kaunter; jangan masukkan maklumat pesakit sebenar.";
    public static final Set<String> CATEGORIES = Set.of("EXECUTIVE", "PENJAGA", "VENDOR", "CONTRACTOR");
    public static final List<String> LEGACY_FIELDS = List.of("fullName", "identificationType", "identificationNumber", "phone",
            "mrn", "wardCode", "relationship", "organisation", "company", "contactPerson", "destinationCode",
            "visitPurpose", "deliveryPurpose", "workPurpose");
    public static final List<String> ALL_FIELDS = java.util.stream.Stream.concat(LEGACY_FIELDS.stream(),
            java.util.stream.Stream.of("currentAddress", "patientName", "destinationCodes")).toList();
    private RegistrationFields() { }

    /** The same definitions drive server validation and the UI metadata; fields never come from caller configuration. */
    public static List<FieldSpec> fields(String category) {
        if (category == null || !CATEGORIES.contains(category)) { throw invalid("categoryCode"); }
        var result = new ArrayList<>(List.of(
                field("fullName", "Nama penuh", "TEXT", 100, "TEXT", "Gunakan nama sintetik.", List.of()),
                field("identificationType", "Jenis pengenalan", "SELECT", 5, "ENUM", "", category.equals("EXECUTIVE")
                        ? List.of(new Option("IC", "IC"), new Option("LESEN", "Lesen")) : List.of(new Option("IC", "IC"))),
                field("identificationNumber", category.equals("EXECUTIVE") ? "No. IC / Lesen" : "No. IC", "TEXT", 30, "IDENTIFICATION", "IC: 12 digit. Lesen: 5–30 huruf/nombor/tanda sempang.", List.of()),
                field("phone", "No. telefon", "PHONE", 16, "PHONE", "Gunakan nombor sintetik sahaja.", List.of())));
        if (category.equals("PENJAGA")) {
            result.add(field("currentAddress", "Alamat terkini", "TEXT", 500, "TEXT", "Gunakan alamat rekaan.", List.of()));
            result.add(field("mrn", "MRN demo", "TEXT", 25, "DEMO_MRN", "Contoh sintetik: DEMO-MRN-4821", List.of()));
            result.add(field("wardCode", "Wad untuk pengesahan manual", "DESTINATION", 32, "REFERENCE", "Pilih hanya jika lookup tidak tersedia.", List.of()));
        } else if (category.equals("EXECUTIVE")) {
            result.add(field("wardCode", "Wad", "DESTINATION", 32, "REFERENCE", "", List.of()));
            result.add(field("patientName", "Nama pesakit", "TEXT", 100, "TEXT", "Gunakan nama pesakit rekaan.", List.of()));
        } else {
            result.add(field("company", "Syarikat", "TEXT", 120, "TEXT", "", List.of()));
            result.add(field("destinationCodes", "Lokasi", "DESTINATIONS", 32, "REFERENCES", "Pilih satu atau lebih lokasi.", List.of()));
        }
        return List.copyOf(result);
    }

    /** Legacy validation is retained for historical tools; fresh HTTP submission requires VERSION instead. */
    public static List<FieldSpec> legacyFields(String category) {
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
        var definitions = legacyFields(category);
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

    /** Patient lookup fields cannot be injected: Penjaga patient data is bound exclusively from a server receipt. */
    public static Map<String, Object> validateCurrent(String category, JsonNode input) {
        var definitions = fields(category);
        if (input == null || !input.isObject()) throw invalid("formData");
        var allowed = definitions.stream().map(FieldSpec::name).collect(java.util.stream.Collectors.toSet());
        if (input.properties().stream().anyMatch(property -> !allowed.contains(property.getKey()))) throw invalid("formData");
        var result = new LinkedHashMap<String, Object>();
        for (var field : definitions) {
            var node = input.path(field.name());
            // A lookup-bound Penjaga ward is optional in the command and is never trusted when proof exists.
            if (category.equals("PENJAGA") && field.name().equals("wardCode") && node.isMissingNode()) continue;
            if (field.name().equals("destinationCodes")) {
                if (!node.isArray() || node.size() < 1 || node.size() > 50) throw invalid("formData.destinationCodes");
                var codes = new ArrayList<String>();
                for (var item : node) {
                    String code = normalized(RegistrationPayload.text(item, "formData.destinationCodes", 100), 32, "formData.destinationCodes");
                    if (!selectableCode(code) || codes.contains(code)) throw invalid("formData.destinationCodes");
                    codes.add(code);
                }
                result.put(field.name(), List.copyOf(codes)); continue;
            }
            String value = normalized(RegistrationPayload.text(node, "formData." + field.name(), 8192), field.maxLength(), "formData." + field.name());
            boolean valid = switch (field.rule()) {
                case "ENUM" -> field.options().stream().anyMatch(option -> option.value().equals(value));
                case "PHONE" -> value.matches("\\+[0-9]{8,15}");
                case "DEMO_MRN" -> value.matches("DEMO-MRN-[A-Z0-9]{4,16}");
                case "REFERENCE" -> selectableCode(value);
                default -> true;
            };
            if (!valid) throw invalid("formData." + field.name());
            result.put(field.name(), value);
        }
        String type = (String) result.get("identificationType"), number = (String) result.get("identificationNumber");
        boolean identityValid = type.equals("IC") ? number.matches("[0-9]{12}|[0-9]{6}-[0-9]{2}-[0-9]{4}")
                : number.matches("[A-Za-z0-9][A-Za-z0-9-]{4,29}");
        if (!identityValid) throw invalid("formData.identificationNumber");
        if (type.equals("IC")) result.put("identificationNumber", number.replace("-", ""));
        return result;
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
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFC);
        // Printable Unicode spaces, including NBSP/figure/narrow spaces, share one explicit trim/blank policy with the UI.
        int start=0,end=normalized.length();
        while(start<end && blankSpace(normalized.codePointAt(start))) { start+=Character.charCount(normalized.codePointAt(start)); }
        while(end>start && blankSpace(normalized.codePointBefore(end))) { end-=Character.charCount(normalized.codePointBefore(end)); }
        normalized=normalized.substring(start,end);
        int length = normalized.codePointCount(0, normalized.length());
        if (length < 1 || length > max || normalized.codePoints().anyMatch(character ->
                Character.isISOControl(character) || Character.getType(character) == Character.FORMAT)) { throw invalid(field); }
        return normalized;
    }
    private static boolean blankSpace(int codepoint) { return Character.isWhitespace(codepoint) || Character.isSpaceChar(codepoint); }

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
