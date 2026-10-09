package eduupm.hsaas.config;

import java.io.IOException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;
import eduupm.hsaas.auth.GuardedSessionRepository;
import eduupm.hsaas.common.ApiErrors;
import eduupm.hsaas.common.ApiFailure;

/** Buffers API responses until request-end Session saving succeeds, including the login response. */
public class SessionResponseFilter extends OncePerRequestFilter {
    private final GuardedSessionRepository sessions;
    private final ApiErrors errors;
    public SessionResponseFilter(GuardedSessionRepository sessions,ApiErrors errors) { this.sessions=sessions; this.errors=errors; }

    /** A late save failure yields a safe failure response, never a buffered login success or cookie. */
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
            throws ServletException,IOException {
        // The policy surrounds explicit controller saves and the automatic SessionRepositoryFilter tail save.
        sessions.beginRequest(request.getServletPath());
        if(!request.getServletPath().startsWith("/api/")) {
            // Non-API responses do not need API buffering, but pool threads must release any tracked Session.
            try { chain.doFilter(request,response); } finally { sessions.clearRequest(); }
            return;
        }
        var buffered=new ContentCachingResponseWrapper(response);
        response.setHeader("X-Correlation-ID",errors.correlation(request));
        response.setHeader("Cache-Control","no-store"); response.setHeader("Referrer-Policy","no-referrer");
        try { chain.doFilter(request,buffered); }
        catch(Exception failure) {
            if(buffered.isCommitted()) { throw new ServletException("Response persistence failure"); }
            int originalStatus=buffered.getStatus();
            buffered.reset();
            ApiFailure safe=failure instanceof ApiFailure known && originalStatus>=400 && originalStatus<500 ? known :
                    new ApiFailure(503,"SERVICE_UNAVAILABLE","Request outcome unavailable. Keep the original command key.");
            errors.write(request,buffered,safe);
        } finally { sessions.clearRequest(); }
        buffered.copyBodyToResponse();
    }
}
