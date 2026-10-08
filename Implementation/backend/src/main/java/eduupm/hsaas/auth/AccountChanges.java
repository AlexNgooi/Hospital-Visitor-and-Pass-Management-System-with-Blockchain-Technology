package eduupm.hsaas.auth;

import java.time.Clock;
import java.util.stream.Stream;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import eduupm.hsaas.common.*;

/** Supplies M06 with guarded account/permission mutations and the last-admin invariant. */
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
            if(target.active() && target.role().equals("ADMIN") && (!active || !role.equals("ADMIN"))
                    && jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE active=TRUE AND role='ADMIN'",Integer.class)<=1) {
                throw new ApiFailure(409,"LAST_ADMIN_REQUIRED","Keep at least one active administrator.");
            }
            jdbc.update("UPDATE users SET role=?,active=?,version=version+1,security_epoch=security_epoch+1,updated_at=? WHERE id=?",role,active,DatabaseTime.sql(clock.instant()),targetId);
            audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"USER",Long.toString(targetId),actorId,
                    new LocalAuditPort.Snapshot(target.active()?"ACTIVE":"INACTIVE",active?"ACTIVE":"INACTIVE",expectedVersion,expectedVersion+1,"LOCAL"));
        });
    }

    /** Permission edits share principal locks and invalidate every old context owned by the affected account. */
    public void counterPermission(Proof proof,long targetId,long counterId,long expectedVersion,boolean active) {
        long actorId=accounts.find(proof.login()).id();
        tx.executeWithoutResult(status -> {
            Stream.of(actorId,targetId).distinct().sorted().forEach(accounts::lock);
            // Counter precedes the permission row and actor capability in every administration path.
            if(jdbc.query("SELECT id FROM counters WHERE id=? FOR UPDATE",(rs,n)->rs.getLong(1),counterId).isEmpty()) {
                throw new ApiFailure(404,"NOT_FOUND","Counter not found.");
            }
            var versions=jdbc.query("SELECT version FROM user_counter_permissions WHERE user_id=? AND counter_id=? FOR UPDATE",(rs,n)->rs.getLong(1),targetId,counterId);
            long current=versions.isEmpty()?0:versions.getFirst();
            if(current!=expectedVersion) { throw new ApiFailure(409,"VERSION_CONFLICT","Permission changed. Reload it."); }
            requireAdmin(proof);
            jdbc.update("INSERT INTO user_counter_permissions(user_id,counter_id,active,version) VALUES(?,?,?,1) ON DUPLICATE KEY UPDATE active=?,version=version+1",targetId,counterId,active,active);
            jdbc.update("UPDATE users SET security_epoch=security_epoch+1,version=version+1,updated_at=? WHERE id=?",DatabaseTime.sql(clock.instant()),targetId);
            audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"USER",Long.toString(targetId),actorId,new LocalAuditPort.Snapshot(null,active?"ENABLED":"DISABLED",expectedVersion,expectedVersion+1,"LOCAL"));
        });
    }

    /** Counter closure takes counter before the actor context; it never traverses other owners in reverse order. */
    public void counterActive(Proof proof,long counterId,long expectedVersion,boolean active) {
        long actorId=accounts.find(proof.login()).id();
        tx.executeWithoutResult(status -> {
            accounts.lock(actorId);
            var versions=jdbc.query("SELECT version FROM counters WHERE id=? FOR UPDATE",(rs,n)->rs.getLong(1),counterId);
            if(versions.isEmpty()) { throw new ApiFailure(404,"NOT_FOUND","Counter not found."); }
            if(versions.getFirst()!=expectedVersion) { throw new ApiFailure(409,"VERSION_CONFLICT","Counter changed. Reload it."); }
            requireAdmin(proof);
            jdbc.update("UPDATE counters SET active=?,version=version+1 WHERE id=?",active,counterId);
            audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"COUNTER",Long.toString(counterId),actorId,new LocalAuditPort.Snapshot(null,active?"ENABLED":"DISABLED",expectedVersion,expectedVersion+1,"LOCAL"));
        });
    }

    /** Cached roles cannot authorize an administration command after epoch or session revocation. */
    private void requireAdmin(Proof proof) {
        var actor=capabilities.requireHuman(proof.bindingId(),proof.contextId(),proof.generation(),proof.login());
        if(!actor.role().equals("ADMIN")) { throw new ApiFailure(403,"ACCESS_DENIED","Administrator access required."); }
    }
    /** Server-derived Session attributes only; future controllers must not bind this from JSON. */
    public record Proof(String bindingId,String contextId,Long generation,String login) { }
}
