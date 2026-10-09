package eduupm.hsaas.registration.review;

import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.ApiFailure;
import static org.assertj.core.api.Assertions.*;

/** Tests only internal servlet coordinate extraction; actual JDBC session/role/CSRF acceptance belongs to real HTTP tests. */
class ReviewHttpTests {
    @AfterEach void clearContext() { SecurityContextHolder.clearContext(); }

    /** A missing session is denied without minting a new browser capability. */
    @Test void missingSessionIsNotCreated() {
        authenticated(); var request = new MockHttpServletRequest();
        denied(request); assertThat(request.getSession(false)).isNull();
    }
    /** Metadata alone cannot substitute for an authenticated, non-anonymous Spring principal. */
    @Test void missingAnonymousAndUntrustedAuthenticationAreDenied() {
        var request = request(); denied(request);
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken("fixture", "anonymousUser",
                List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS")))); denied(request);
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.unauthenticated("staff", "fixture"));
        denied(request);
    }
    /** Caller query/header/body coordinates never override framework session attributes or the principal's login. */
    @Test void onlyServerSessionCoordinatesReachTheService() {
        authenticated(); var request = request(); request.addParameter("ownerContextId", "caller-owner");
        request.addHeader("X-Actor-ID", "999"); request.setContent("{\"bindingId\":\"caller-binding\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertThat(ReviewHttp.context(request)).isEqualTo(new ReviewService.StaffContext("server-binding", "server-owner", 1L, "staff"));
    }
    /** Attribute types cannot be coerced from caller strings, and any absent coordinate fails uniformly. */
    @Test void absentOrMalformedMetadataIsDenied() {
        authenticated();
        for (String name : List.of(SessionCapabilities.BINDING, SessionCapabilities.CONTEXT, SessionCapabilities.GENERATION)) {
            var request = request(); request.getSession(false).removeAttribute(name); denied(request);
        }
        var request = request(); request.getSession(false).setAttribute(SessionCapabilities.GENERATION, "1"); denied(request);
    }
    /** Controllers establish non-cacheable privacy headers before a context failure, including unauthenticated reads. */
    @Test void headersRemainOnDeniedRequests() {
        var response = new MockHttpServletResponse(); ReviewHttp.noStore(response); denied(new MockHttpServletRequest());
        assertThat(response.getHeader("Cache-Control")).isEqualTo("no-store");
        assertThat(response.getHeader("Referrer-Policy")).isEqualTo("no-referrer");
    }
    private void authenticated() {
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated("staff", null,
                List.of(new SimpleGrantedAuthority("ROLE_COUNTER_STAFF"))));
    }
    private MockHttpServletRequest request() {
        var request = new MockHttpServletRequest(); var session = request.getSession();
        session.setAttribute(SessionCapabilities.BINDING, "server-binding"); session.setAttribute(SessionCapabilities.CONTEXT, "server-owner");
        session.setAttribute(SessionCapabilities.GENERATION, 1L); return request;
    }
    private void denied(MockHttpServletRequest request) {
        assertThatThrownBy(() -> ReviewHttp.context(request)).isInstanceOfSatisfying(ApiFailure.class,
                failure -> assertThat(failure.status()).isEqualTo(401));
    }
}
