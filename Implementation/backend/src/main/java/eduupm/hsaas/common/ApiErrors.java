package eduupm.hsaas.common;

import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** Writes the same safe error envelope from MVC, security filters, and session-save failures. */
@Component
public class ApiErrors {
    public static final String CORRELATION_ATTRIBUTE = ApiErrors.class.getName() + ".correlation";
    private final Clock clock;
    private final JsonMapper json;
    public ApiErrors(Clock clock, JsonMapper json) { this.clock = clock; this.json = json; }

    /** Generates server-controlled correlation IDs; caller headers cannot inject logs. */
    public String correlation(HttpServletRequest request) {
        if (request.getAttribute(CORRELATION_ATTRIBUTE) == null) {
            request.setAttribute(CORRELATION_ATTRIBUTE, UUID.randomUUID().toString());
        }
        return (String) request.getAttribute(CORRELATION_ATTRIBUTE);
    }

    /** Prevents framework failures from becoming HTML, stack traces, or SQL disclosures. */
    public void write(HttpServletRequest request, HttpServletResponse response, ApiFailure failure) throws IOException {
        response.setStatus(failure.status());
        response.setContentType("application/json");
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Referrer-Policy","no-referrer");
        response.setHeader("X-Content-Type-Options","nosniff");
        response.setHeader("X-Frame-Options","DENY");
        response.setHeader("X-Correlation-ID", correlation(request));
        json.writeValue(response.getOutputStream(), new Envelope(clock.instant(), failure.status(),
                failure.code(), failure.getMessage(), correlation(request), failure.fields(),failure.details()));
    }

    /** The envelope contains no exception class, sensitive values, or implicit success state. */
    public record Envelope(Instant timestamp, int status, String code, String message,
            String correlationId, List<ApiFailure.FieldError> fieldErrors,
            @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL) RestartDetails details) { }
}
