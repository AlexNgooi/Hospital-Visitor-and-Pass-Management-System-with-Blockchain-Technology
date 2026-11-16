package eduupm.hsaas.registration;

/** Produces bounded operational labels without returning root form JSON or full identifiers. */
public final class RegistrationMasking {
    private RegistrationMasking() { }

    /** Shows at most one actual letter; names remain masked even if their input is unexpectedly malformed. */
    public static String name(String value) {
        if (value == null) { return "***"; }
        return value.codePoints().filter(Character::isLetter).findFirst()
                .stream().mapToObj(character -> new String(Character.toChars(character)) + "***").findFirst().orElse("***");
    }

    /** Authorized staff queues show twelve Unicode characters; other projections retain their existing masking. */
    public static String displayName(String value) {
        if (value == null || value.isBlank()) return "—";
        String safe = value.codePoints().filter(character -> !Character.isISOControl(character)
                && Character.getType(character) != Character.FORMAT)
                .collect(StringBuilder::new, StringBuilder::appendCodePoint, StringBuilder::append).toString().strip();
        if (safe.isEmpty()) return "—";
        int count = safe.codePointCount(0, safe.length());
        return count <= 12 ? safe : safe.substring(0, safe.offsetByCodePoints(0, 12)) + "…";
    }

    /** Only a safe ASCII suffix of a sufficiently long identifier is visible, never its clinical/demo prefix. */
    public static String identification(String value) { return suffix(value, false); }

    /** Phone masking reveals at most four digits and never a callable full number. */
    public static String phone(String value) { return suffix(value, true); }

    /** Controlled reference labels must fit the existing M04 wire; malformed catalogue labels get a safe fallback. */
    public static String destination(String value) {
        if (value == null || value.isBlank() || value.length() > 120
                || value.codePoints().anyMatch(character -> Character.isISOControl(character)
                        || Character.getType(character) == Character.FORMAT)) {
            return "Lokasi demo";
        }
        return value;
    }

    private static String suffix(String value, boolean digitsOnly) {
        if (value == null) { return "***"; }
        var safe = new StringBuilder();
        value.codePoints().filter(character -> character >= '0' && character <= '9'
                || !digitsOnly && (character >= 'A' && character <= 'Z' || character >= 'a' && character <= 'z'))
                .forEach(safe::appendCodePoint);
        // Short invalid input is completely masked so the suffix cannot reveal its entire value.
        return safe.length() <= 4 ? "***" : "***" + safe.substring(safe.length() - 4);
    }
}
