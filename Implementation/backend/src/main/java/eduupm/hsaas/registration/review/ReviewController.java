package eduupm.hsaas.registration.review;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.common.IdempotencyPort;

/** Spring's existing staff role/CSRF chain precedes these adapters; response bodies contain only safe command results. */
@RestController
@ConditionalOnProperty(name = "hsaas.review.enabled", havingValue = "true")
public class ReviewController {
    private final ReviewService reviews;
    public ReviewController(ReviewService reviews) { this.reviews = reviews; }

    /** Approval and verification are one command; no caller actor/time or pass-related fields are accepted. */
    @PostMapping(value = "/api/staff/registrations/{id}/verify", consumes = "application/json")
    public IdempotencyPort.SafeResult verify(@PathVariable String id, @RequestHeader(name = "Idempotency-Key", required = false) String key,
            @RequestBody String body, HttpServletRequest request, HttpServletResponse response) {
        noStore(response); return reviews.verify(context(request), id, key, body);
    }
    /** Rejection persists a safe reason in the same local transaction, without an external message job. */
    @PostMapping(value = "/api/staff/registrations/{id}/reject", consumes = "application/json")
    public IdempotencyPort.SafeResult reject(@PathVariable String id, @RequestHeader(name = "Idempotency-Key", required = false) String key,
            @RequestBody String body, HttpServletRequest request, HttpServletResponse response) {
        noStore(response); return reviews.reject(context(request), id, key, body);
    }
    private ReviewService.StaffContext context(HttpServletRequest request) {
        var session = request.getSession(false);
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (session == null || authentication == null
                || !(session.getAttribute(SessionCapabilities.BINDING) instanceof String binding)
                || !(session.getAttribute(SessionCapabilities.CONTEXT) instanceof String owner)
                || !(session.getAttribute(SessionCapabilities.GENERATION) instanceof Long generation)) throw ApiFailure.unauthenticated();
        return new ReviewService.StaffContext(binding, owner, generation, authentication.getName());
    }
    private void noStore(HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store"); response.setHeader("Referrer-Policy", "no-referrer");
    }
}
