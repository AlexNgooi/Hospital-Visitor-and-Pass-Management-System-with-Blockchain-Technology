package eduupm.hsaas.common;

import java.util.List;

/** Carries only approved user-facing diagnostics; never attach raw input or database exceptions. */
public class ApiFailure extends RuntimeException {
    private final int status;
    private final String code;
    private final List<FieldError> fields;
    private final RestartDetails details;

    /** Creates a safe non-field business failure. */
    public ApiFailure(int status, String code, String message) {
        this(status, code, message, List.of());
    }

    /** Creates a whitelist-only validation failure without rejected values. */
    public ApiFailure(int status, String code, String message, List<FieldError> fields) {
        this(status,code,message,fields,null);
    }
    /** Only RESTART_REQUIRED may carry the explicit non-PII C10 shape. */
    public ApiFailure(int status,String code,String message,List<FieldError> fields,RestartDetails details) {
        super(message);
        this.status = status; this.code = code; this.fields = List.copyOf(fields);
        if(details!=null && !"REGISTRATION_ENTRY_RESTART_REQUIRED".equals(code)) { throw new IllegalArgumentException("Unsupported error details"); }
        this.details=details;
    }
    public int status() { return status; }
    public String code() { return code; }
    public List<FieldError> fields() { return fields; }
    public RestartDetails details() { return details; }

    /** Safe field diagnostics deliberately omit rejectedValue. */
    public record FieldError(String field, String code, String message) { }

    /** Gives all expired or missing human sessions the same authentication boundary. */
    public static ApiFailure unauthenticated() {
        return new ApiFailure(401, "AUTHENTICATION_REQUIRED", "Please sign in again.");
    }
}
