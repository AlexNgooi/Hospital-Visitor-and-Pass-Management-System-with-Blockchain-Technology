package eduupm.hsaas.registration;

import java.time.Clock;
import java.util.HashMap;
import jakarta.servlet.http.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.ApiFailure;

/** Public HTTP keeps framework CSRF/session security and obtains anonymous identity only from the actual server Session. */
@RestController
@ConditionalOnProperty(name = "hsaas.registration.enabled", havingValue = "true")
public final class RegistrationController {
    private final RegistrationService service;
    private final Clock clock;
    private final HashMap<String, Bucket> buckets = new HashMap<>();
    public RegistrationController(RegistrationService service, Clock clock) { this.service = service; this.clock = clock; }

    @PostMapping(value = "/api/public/registration-schema", consumes = "application/json")
    public RegistrationService.SchemaReply schema(@RequestBody String body, HttpServletRequest request, HttpServletResponse response) {
        noStore(response); String binding = binding(request); limited(binding, request.getRemoteAddr()); return service.schema(binding, body);
    }
    @PostMapping(value = "/api/public/mrn-validations", consumes = "application/json")
    public RegistrationService.FeedbackReply feedback(@RequestBody String body, HttpServletRequest request, HttpServletResponse response) {
        noStore(response); String binding = binding(request); limited(binding, request.getRemoteAddr()); return service.validateMrn(binding, body);
    }
    @PostMapping(value = "/api/public/registrations", consumes = "application/json")
    public RegistrationService.Receipt submit(@RequestBody String body, @RequestHeader(name = "Idempotency-Key", required = false) String key,
            HttpServletRequest request, HttpServletResponse response) {
        noStore(response); String binding = binding(request); limited(binding, request.getRemoteAddr()); response.setStatus(201); return service.submit(binding, key, body);
    }
    private String binding(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session == null || !(session.getAttribute(SessionCapabilities.BINDING) instanceof String value)) {
            throw new ApiFailure(403, "REGISTRATION_ENTRY_REQUIRED", "Scan the counter QR to register.");
        }
        return value;
    }
    private void noStore(HttpServletResponse response) { response.setHeader("Cache-Control", "no-store"); response.setHeader("Referrer-Policy", "no-referrer"); }

    /** Bounded local throttling uses only trusted binding/socket coordinates; distributed protection is a release concern. */
    private synchronized void limited(String binding, String socket) {
        long minute = clock.instant().getEpochSecond() / 60;
        buckets.entrySet().removeIf(entry -> entry.getValue().minute() != minute);
        if (buckets.size() >= 10000) { throw rateLimited(); }
        increment("binding:" + binding, 60, minute); increment("socket:" + socket, 600, minute);
    }
    private void increment(String key, int maximum, long minute) {
        var value = buckets.getOrDefault(key, new Bucket(minute, 0));
        if (value.count() >= maximum) { throw rateLimited(); } buckets.put(key, new Bucket(minute, value.count() + 1));
    }
    private ApiFailure rateLimited() { return new ApiFailure(429, "RATE_LIMITED", "Please wait before retrying the registration."); }
    private record Bucket(long minute, int count) { }
}
