package eduupm.hsaas.administration;

import java.util.Set;
import eduupm.hsaas.common.ApiFailure;

/** Bounded whitelist validation is shared by administration commands and never echoes rejected input. */
public final class AdminInputs {
    private AdminInputs() { }
    public static final Set<String> REASONS=Set.of("POLICY_UPDATE","STAFF_ONBOARDING","ACCESS_REVIEW","REFERENCE_CORRECTION","OPERATIONS_CHANGE");
    /** Decimal string IDs preserve the complete database range across JavaScript clients. */
    public static long id(String value) {
        try { if(value==null || !value.matches("[1-9][0-9]{0,18}")) throw invalid(); return Long.parseLong(value); }
        catch(NumberFormatException failure) { throw invalid(); }
    }
    /** All versions crossing the browser boundary fit exact JavaScript integers. */
    public static long version(Long value) { if(value==null || value<0 || value>=9007199254740991L) throw invalid(); return value; }
    public static String reason(String value) { if(!REASONS.contains(value==null?"":value)) throw invalid(); return value; }
    public static String role(String value) { if(!Set.of("ADMIN","COUNTER_STAFF").contains(value==null?"":value)) throw invalid(); return value; }
    public static boolean active(Boolean value) { if(value==null) throw invalid(); return value; }
    /** Reference labels accept readable text, while control/format characters cannot enter lists or exports. */
    public static String name(String value) {
        if(value==null || value.isBlank() || value.length()>120 || value.codePoints().anyMatch(c->Character.isISOControl(c)||Character.getType(c)==Character.FORMAT)) throw invalid();
        return value.strip();
    }
    public static String code(String value) { if(value==null || !value.matches("[A-Z][A-Z0-9_-]{0,63}")) throw invalid(); return value; }
    public static ApiFailure invalid() { return new ApiFailure(400,"VALIDATION_FAILED","Check the request fields."); }
}
