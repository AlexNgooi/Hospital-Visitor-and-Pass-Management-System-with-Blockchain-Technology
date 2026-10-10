package eduupm.hsaas.registration.review;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.ApiFailure;

/** Shared review transport boundary: framework session coordinates are internal and every read/write is non-cacheable. */
final class ReviewHttp {
    private ReviewHttp() { }

    /** Never creates a session or accepts owner/actor coordinates from body, query, header or cached client role. */
    static ReviewService.StaffContext context(HttpServletRequest request) {
        var session = request.getSession(false);
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (session == null || authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || !(session.getAttribute(SessionCapabilities.BINDING) instanceof String binding)
                || !(session.getAttribute(SessionCapabilities.CONTEXT) instanceof String owner)
                || !(session.getAttribute(SessionCapabilities.GENERATION) instanceof Long generation)) throw ApiFailure.unauthenticated();
        // Services still revalidate actual persisted session metadata and current role/counter before accessing the root.
        return new ReviewService.StaffContext(binding, owner, generation, authentication.getName());
    }
    /** Set headers before resolving the context so transport-level denials retain the privacy policy. */
    static void noStore(HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store"); response.setHeader("Referrer-Policy", "no-referrer");
    }
}
