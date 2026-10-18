package eduupm.hsaas.assignment;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import eduupm.hsaas.auth.Accounts;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.card.CardRules;
import eduupm.hsaas.common.ApiFailure;

/** Freezes current account/counter/session authority before any device/domain lock or successful replay. */
final class LifecycleSecurity {
    private final Accounts accounts;
    private final SessionCapabilities capabilities;
    private final JdbcTemplate jdbc;
    LifecycleSecurity(Accounts accounts,SessionCapabilities capabilities,JdbcTemplate jdbc) {
        this.accounts=accounts; this.capabilities=capabilities; this.jdbc=jdbc;
    }
    Accounts.Account preflight(Context context,boolean admin) {
        var actor=capabilities.requireHuman(context.binding(),context.owner(),context.generation(),context.login());
        role(actor,admin); return actor;
    }
    /** All counters are discovered first and locked in ascending order; requireHuman below only re-enters held locks. */
    Accounts.Account lock(Context context,boolean admin,List<Long> counters) {
        var actors=jdbc.query("SELECT actor_id FROM auth_session_contexts WHERE id=?",(rs,n)->rs.getLong(1),context.owner());
        if(actors.isEmpty()) throw ApiFailure.unauthenticated();
        var actor=accounts.lock(actors.getFirst()); role(actor,admin);
        for(long counter:counters.stream().distinct().sorted().toList()) {
            var rows=jdbc.query("SELECT active FROM counters WHERE id=? FOR UPDATE",(rs,n)->rs.getBoolean(1),counter);
            if(rows.isEmpty() || !rows.getFirst()) throw CardRules.unavailable();
        }
        if(admin) capabilities.requireHuman(context.binding(),context.owner(),context.generation(),context.login());
        else {
            try { capabilities.lockOwners(counters.stream().map(id->new SessionCapabilities.OwnerUse(context.owner(),id)).toList(),null); }
            catch(ApiFailure failure) { if(failure.status()==410) throw CardRules.unavailable(); throw failure; }
            capabilities.requireHuman(context.binding(),context.owner(),context.generation(),context.login());
        }
        return actor;
    }
    private static void role(Accounts.Account actor,boolean admin) {
        if(!actor.active()) throw ApiFailure.unauthenticated();
        if(!actor.role().equals(admin?"ADMIN":"COUNTER_STAFF")) throw new ApiFailure(403,"ACCESS_DENIED","This role cannot perform the lifecycle action.");
    }
    /** Coordinates come only from Spring's authenticated session, never a JSON body. */
    record Context(String binding,String owner,Long generation,String login) {
        @Override public String toString() { return "LifecycleContext[REDACTED]"; }
    }
}
