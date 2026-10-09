package eduupm.hsaas.registration.review;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import eduupm.hsaas.common.IdempotencyPort;
import eduupm.hsaas.registration.RegistrationReadPort;

/** Existing staff role/CSRF security precedes masked GET and safe-command POST adapters; no persistence entity is returned. */
@RestController
@ConditionalOnProperty(name = "hsaas.review.enabled", havingValue = "true")
public class ReviewController {
    private final ReviewService reviews;
    private final ReviewReadService reads;
    public ReviewController(ReviewService reviews, ReviewReadService reads) { this.reviews = reviews; this.reads = reads; }

    /** Multi-value binding preserves duplicate parameters so query validation cannot silently broaden a selected view. */
    @GetMapping("/api/staff/registrations")
    public RegistrationReadPort.QueuePage queue(@RequestParam MultiValueMap<String, String> parameters,
            HttpServletRequest request, HttpServletResponse response) {
        ReviewHttp.noStore(response); return reads.queue(ReviewHttp.context(request), parameters);
    }
    /** The path/reference is never a capability; service/root recheck current authority and return a typed masked projection. */
    @GetMapping("/api/staff/registrations/{id}")
    public RegistrationReadPort.Detail detail(@PathVariable String id, @RequestParam MultiValueMap<String, String> parameters,
            HttpServletRequest request, HttpServletResponse response) {
        ReviewHttp.noStore(response); return reads.detail(ReviewHttp.context(request), id, parameters);
    }

    /** Approval and verification are one command; no caller actor/time or pass-related fields are accepted. */
    @PostMapping(value = "/api/staff/registrations/{id}/verify", consumes = "application/json")
    public IdempotencyPort.SafeResult verify(@PathVariable String id, @RequestHeader(name = "Idempotency-Key", required = false) String key,
            @RequestBody String body, HttpServletRequest request, HttpServletResponse response) {
        ReviewHttp.noStore(response); return reviews.verify(ReviewHttp.context(request), id, key, body);
    }
    /** Rejection persists a safe reason in the same local transaction, without an external message job. */
    @PostMapping(value = "/api/staff/registrations/{id}/reject", consumes = "application/json")
    public IdempotencyPort.SafeResult reject(@PathVariable String id, @RequestHeader(name = "Idempotency-Key", required = false) String key,
            @RequestBody String body, HttpServletRequest request, HttpServletResponse response) {
        ReviewHttp.noStore(response); return reviews.reject(ReviewHttp.context(request), id, key, body);
    }
}
