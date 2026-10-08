package eduupm.hsaas.auth;

import java.util.List;
import java.util.Locale;
import eduupm.hsaas.common.ApiFailure;

/** Keeps account creation, authentication, and uniqueness on one ASCII canonical form. */
public final class LoginNames {
    private LoginNames() { }

    /** Trims U+0020 only; passwords and Unicode lookalikes must never be normalized here. */
    public static String canonical(String login) {
        if (login == null || login.length() > 256 || login.chars().anyMatch(character -> character > 127)) { throw invalid(); }
        int start = 0, end = login.length();
        while (start < end && login.charAt(start) == ' ') { start++; }
        while (end > start && login.charAt(end - 1) == ' ') { end--; }
        String result = login.substring(start, end).toLowerCase(Locale.ROOT);
        if (!result.matches("[a-z0-9][a-z0-9._-]{2,63}")) { throw invalid(); }
        return result;
    }

    /** Does not include the original account value in diagnostics. */
    private static ApiFailure invalid() {
        return new ApiFailure(400, "VALIDATION_FAILED", "Check the request fields.",
                List.of(new ApiFailure.FieldError("login", "FORMAT", "Use a 3–64 character staff account.")));
    }
}
