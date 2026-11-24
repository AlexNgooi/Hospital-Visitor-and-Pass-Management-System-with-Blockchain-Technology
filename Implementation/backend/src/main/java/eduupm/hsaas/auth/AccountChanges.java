package eduupm.hsaas.auth;

import java.time.Clock;
import java.util.stream.Stream;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import eduupm.hsaas.common.*;

/** Supplies M06 with guarded account mutations and the last-admin invariant. */
@Service
public class AccountChanges {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final Accounts accounts;
    private final SessionCapabilities capabilities;
    private final LocalAuditPort audit;
    private final Clock clock;
    public AccountChanges(JdbcTemplate jdbc,TransactionTemplate tx,Accounts accounts,SessionCapabilities capabilities,LocalAuditPort audit,Clock clock) {
        this.jdbc=jdbc; this.tx=tx; this.accounts=accounts; this.capabilities=capabilities; this.audit=audit; this.clock=clock;
    }

    /** Serializes identity policy before principal/context locks and revokes old sessions with one epoch update. */
    public void update(Proof proof,long targetId,long expectedVersion,String role,boolean active) {
        if(!java.util.Set.of("ADMIN","COUNTER_STAFF").contains(role)) { throw new ApiFailure(400,"VALIDATION_FAILED","Invalid role."); }
        long actorId=accounts.find(proof.login()).id();
        tx.executeWithoutResult(status -> {
            jdbc.queryForObject("SELECT id FROM identity_policy_gate WHERE id=1 FOR UPDATE",Integer.class);
            Stream.of(actorId,targetId).distinct().sorted().forEach(accounts::lock);
            Accounts.Account target=accounts.lock(targetId);
            requireAdmin(proof);
            Long version=jdbc.queryForObject("SELECT version FROM users WHERE id=?",Long.class,targetId);
            if(version==null || version!=expectedVersion) { throw new ApiFailure(409,"VERSION_CONFLICT","Account changed. Reload it."); }
            if(target.active() && !target.passwordChangeRequired() && target.role().equals("ADMIN") && (!active || !role.equals("ADMIN"))
                    && jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE active=TRUE AND role='ADMIN' AND password_change_required=FALSE",Integer.class)<=1) {
                throw new ApiFailure(409,"LAST_ADMIN_REQUIRED","Keep at least one active administrator.");
            }
            jdbc.update("UPDATE users SET role=?,active=?,version=version+1,security_epoch=security_epoch+1,updated_at=? WHERE id=?",role,active,DatabaseTime.sql(clock.instant()),targetId);
            audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"USER",Long.toString(targetId),actorId,
                    new LocalAuditPort.Snapshot(target.active()?"ACTIVE":"INACTIVE",active?"ACTIVE":"INACTIVE",expectedVersion,expectedVersion+1,"LOCAL"));
        });
    }

    /** Cached roles cannot authorize an administration command after epoch or session revocation. */
    private Accounts.Account requireAdmin(Proof proof) {
        var actor=capabilities.requireHuman(proof.bindingId(),proof.contextId(),proof.generation(),proof.login());
        if(!actor.role().equals("ADMIN")) { throw new ApiFailure(403,"ACCESS_DENIED","Administrator access required."); }
        return actor;
    }
    /** Server-derived Session attributes only; future controllers must not bind this from JSON. */
    public record Proof(String bindingId,String contextId,Long generation,String login) { }
}
