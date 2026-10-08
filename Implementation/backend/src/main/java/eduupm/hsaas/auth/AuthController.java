package eduupm.hsaas.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.web.bind.annotation.*;
import eduupm.hsaas.common.ApiFailure;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;

/** Implements C01 without signup, tokens in localStorage, or default credentials. */
@RestController
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
public class AuthController {
    private final Accounts accounts;
    private final AuthenticationManager authentication;
    private final SecurityContextRepository contexts;
    private final HttpSessionCsrfTokenRepository csrf;
    private final GuardedSessionRepository sessions;
    private final SessionCapabilities capabilities;
    private final LoginLimiter limiter;
    public AuthController(Accounts accounts,AuthenticationManager authentication,SecurityContextRepository contexts,
            HttpSessionCsrfTokenRepository csrf,GuardedSessionRepository sessions,SessionCapabilities capabilities,LoginLimiter limiter) {
        this.accounts=accounts; this.authentication=authentication; this.contexts=contexts; this.csrf=csrf;
        this.sessions=sessions; this.capabilities=capabilities; this.limiter=limiter;
    }

    /** Persists the anonymous Session and canonical server binding before returning CSRF. */
    @GetMapping("/api/public/csrf")
    public CsrfBootstrap csrf(HttpServletRequest request,HttpServletResponse response) {
        limiter.checkBootstrap(request.getRemoteAddr());
        var session=request.getSession();
        try {
            capabilities.beforeFrameworkSave((String)session.getAttribute(SessionCapabilities.BINDING),
                    (String)session.getAttribute(SessionCapabilities.CONTEXT),(Long)session.getAttribute(SessionCapabilities.GENERATION));
        } catch(ApiFailure denied) {
            if(denied.status()!=401) { throw denied; }
            // Recovery creates a new anonymous identity; lost grants cannot be recovered from a reference.
            session.invalidate(); SecurityContextHolder.clearContext();
            contexts.saveContext(SecurityContextHolder.createEmptyContext(),request,response);
            session=request.getSession(true);
            new XorCsrfTokenRequestAttributeHandler().handle(request,response,()->csrf.loadDeferredToken(request,response).get());
        }
        CsrfToken token=(CsrfToken)request.getAttribute(CsrfToken.class.getName());
        String value=token.getToken();
        sessions.persistCurrent(session.getId());
        SessionCapabilities.Binding binding;
        try { binding=capabilities.bootstrap(session.getId()); }
        catch(DuplicateKeyException race) { binding=capabilities.bootstrap(session.getId()); }
        session.setAttribute(SessionCapabilities.BINDING,binding.id());
        sessions.persistCurrent(session.getId());
        return new CsrfBootstrap(token.getHeaderName(),value);
    }

    /** Confirms login persistence and capability activation before returning the minimal staff DTO. */
    @PostMapping("/api/auth/login")
    public Accounts.Me login(@RequestBody Credentials credentials,HttpServletRequest request,HttpServletResponse response) {
        String login=LoginNames.canonical(credentials.login()); limiter.check(login,request.getRemoteAddr());
        if(credentials.password()==null || credentials.password().isEmpty()
                || credentials.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72) {
            throw new ApiFailure(400,"VALIDATION_FAILED","Check the request fields.");
        }
        org.springframework.security.core.Authentication authenticated;
        try { authenticated=authentication.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(login,credentials.password())); }
        catch(AuthenticationException failure) { throw new ApiFailure(401,"INVALID_CREDENTIALS","Invalid credentials."); }
        var session=request.getSession();
        String binding=(String)session.getAttribute(SessionCapabilities.BINDING);
        if(binding==null) { throw new ApiFailure(403,"CSRF_INVALID","Bootstrap the session before signing in."); }
        var principal=(Accounts.StaffPrincipal)authenticated.getPrincipal();
        var capability=capabilities.prepareLogin(binding,principal.actorId(),principal.securityEpoch());
        request.changeSessionId();
        session.setAttribute(SessionCapabilities.CONTEXT,capability.id()); session.setAttribute(SessionCapabilities.GENERATION,capability.generation());
        var context=SecurityContextHolder.createEmptyContext(); context.setAuthentication(authenticated);
        SecurityContextHolder.setContext(context);
        new CsrfAuthenticationStrategy(csrf).onAuthentication(authenticated,request,response);
        contexts.saveContext(context,request,response);
        sessions.persistCurrent(session.getId());
        var current=capabilities.requireHuman(binding,capability.id(),capability.generation(),login);
        return accounts.view(current);
    }

    /** Revocation commits before framework invalidation; repeat logout remains harmless. */
    @PostMapping("/api/auth/logout")
    public void logout(HttpServletRequest request,HttpServletResponse response) {
        var session=request.getSession(false);
        if(session!=null) { capabilities.revokeSession(session.getId()); session.invalidate(); }
        SecurityContextHolder.clearContext(); response.setStatus(204);
    }

    /** Refreshes current permissions from the database rather than returning cached role authority. */
    @GetMapping("/api/auth/me")
    public Accounts.Me me(HttpServletRequest request) {
        var session=request.getSession(false); if(session==null) { throw ApiFailure.unauthenticated(); }
        var actor=capabilities.requireHuman((String)session.getAttribute(SessionCapabilities.BINDING),
                (String)session.getAttribute(SessionCapabilities.CONTEXT),(Long)session.getAttribute(SessionCapabilities.GENERATION),
                SecurityContextHolder.getContext().getAuthentication().getName());
        return accounts.view(actor);
    }
    /** Passwords exist only in the authentication request, never in error or response objects. */
    public record Credentials(String login,String password) {
        /** Accidental diagnostic formatting must not expose the submitted credentials. */
        @Override public String toString() { return "Credentials[REDACTED]"; }
    }
    /** The CSRF token is separate from the HttpOnly session cookie. */
    public record CsrfBootstrap(String headerName,String token) { }
}
