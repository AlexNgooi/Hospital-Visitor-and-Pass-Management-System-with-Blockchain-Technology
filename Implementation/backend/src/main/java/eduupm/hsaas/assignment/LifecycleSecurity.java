package eduupm.hsaas.assignment;

import eduupm.hsaas.auth.Accounts;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.ApiFailure;

/** Freezes current account and session authority before any device/domain lock or successful replay. */
final class LifecycleSecurity {
    private final SessionCapabilities capabilities;
    LifecycleSecurity(SessionCapabilities capabilities) {
        this.capabilities=capabilities;
    }
    Accounts.Account preflight(Context context,boolean admin) {
        var actor=capabilities.requireHuman(context.binding(),context.owner(),context.generation(),context.login());
        role(actor,admin); return actor;
    }
    /** The caller's transaction holds the account and session locks through the business operation. */
    Accounts.Account lock(Context context,boolean admin) {
        if(!TransactionSynchronizationManager.isActualTransactionActive())
            throw new IllegalStateException("Lifecycle authority requires the caller's transaction");
        return preflight(context,admin);
    }
    private static void role(Accounts.Account actor,boolean admin) {
        if(!actor.active()) throw ApiFailure.unauthenticated();
        if(!actor.role().equals(admin?"ADMIN":"COUNTER_STAFF")) throw new ApiFailure(403,"ACCESS_DENIED","This role cannot perform the lifecycle action.");
        if(!admin && !actor.canHandleVisitors()) throw new ApiFailure(403,"ACCESS_DENIED","Staff access is disabled.");
    }
    /** Coordinates come only from Spring's authenticated session, never a JSON body. */
    record Context(String binding,String owner,Long generation,String login) {
        @Override public String toString() { return "LifecycleContext[REDACTED]"; }
    }
}
