package eduupm.hsaas.administration;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import eduupm.hsaas.auth.AccountChanges.Proof;
import eduupm.hsaas.auth.Accounts;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.ApiFailure;

/** Resolves server-only session proof and revalidates live administrator authority for every operation. */
@Service
public class AdminAccess {
    private final SessionCapabilities capabilities;
    public AdminAccess(SessionCapabilities capabilities) { this.capabilities=capabilities; }

    /** Cached Spring roles are insufficient after an account epoch or session deadline changes. */
    public Accounts.Account require(Proof proof) {
        var actor=capabilities.requireHuman(proof.bindingId(),proof.contextId(),proof.generation(),proof.login());
        if (!"ADMIN".equals(actor.role())) throw new ApiFailure(403,"ACCESS_DENIED","Administrator access required.");
        return actor;
    }

    /** Owner coordinates never come from JSON, query parameters or headers. */
    public static Proof proof(HttpServletRequest request,HttpServletResponse response) {
        response.setHeader("Cache-Control","no-store"); response.setHeader("Referrer-Policy","no-referrer");
        var session=request.getSession(false);
        var authentication=SecurityContextHolder.getContext().getAuthentication();
        if(session==null || authentication==null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken
                || !(session.getAttribute(SessionCapabilities.BINDING) instanceof String binding)
                || !(session.getAttribute(SessionCapabilities.CONTEXT) instanceof String context)
                || !(session.getAttribute(SessionCapabilities.GENERATION) instanceof Long generation)) throw ApiFailure.unauthenticated();
        return new Proof(binding,context,generation,authentication.getName());
    }
}
