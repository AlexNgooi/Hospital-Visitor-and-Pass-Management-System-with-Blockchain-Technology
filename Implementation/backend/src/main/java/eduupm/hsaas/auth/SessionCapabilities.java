package eduupm.hsaas.auth;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.common.DatabaseTime;
import eduupm.hsaas.config.FoundationProperties;

/** Implements the C12 revocation barrier and confirmed-save guard independently of Session events. */
@Service
public class SessionCapabilities {
    public static final String BINDING = "HSAAS_BINDING", CONTEXT = "HSAAS_CONTEXT", GENERATION = "HSAAS_GENERATION";
    private final JdbcTemplate jdbc;
    private final Accounts accounts;
    private final SessionMetadata metadata;
    private final TransactionTemplate tx;
    private final Clock clock;
    private final FoundationProperties properties;

    public SessionCapabilities(JdbcTemplate jdbc, Accounts accounts, SessionMetadata metadata,
            TransactionTemplate tx, Clock clock, FoundationProperties properties) {
        this.jdbc=jdbc; this.accounts=accounts; this.metadata=metadata; this.tx=tx; this.clock=clock; this.properties=properties;
    }

    /** Allocates one stable anonymous scope after the framework session exists; duplicate races retry externally. */
    public Binding bootstrap(String sessionId) {
        return tx.execute(status -> {
            var actual = metadata.bySessionId(sessionId);
            if (actual == null || !clock.instant().isBefore(actual.expiresAt())) { throw ApiFailure.unauthenticated(); }
            var rows = jdbc.query("SELECT * FROM app_session_bindings WHERE spring_primary_id=? FOR UPDATE", this::binding, actual.primaryId());
            if (!rows.isEmpty()) { checkAnonymous(rows.getFirst(), actual); return rows.getFirst(); }
            Instant now = clock.instant();
            var binding = new Binding(UUID.randomUUID().toString(), actual.primaryId(), UUID.randomUUID().toString(),
                    now.plus(properties.anonymousAbsolute()), null, 0, false);
            jdbc.update("INSERT INTO app_session_bindings(id,spring_primary_id,anonymous_scope_id,anonymous_created_at,anonymous_expires_at) VALUES(?,?,?,?,?)",
                    binding.id(), binding.primary(), binding.scope(), DatabaseTime.sql(now), DatabaseTime.sql(binding.anonymousDeadline()));
            return binding;
        });
    }

    /** Prepares a new context, never reactivating a previous login's display capabilities. */
    public Context prepareLogin(String bindingId, long actorId,long authenticatedEpoch) {
        Binding discovered = findBinding(bindingId, false);
        Context old = discovered.owner() == null ? null : findContext(discovered.owner(), false);
        return tx.execute(status -> {
            List<Long> principals = new ArrayList<>(List.of(actorId));
            if (old != null) { principals.add(old.actor()); }
            principals.stream().distinct().sorted().forEach(accounts::lock);
            Accounts.Account actor = accounts.lock(actorId);
            if (!actor.active() || actor.epoch()!=authenticatedEpoch) { throw ApiFailure.unauthenticated(); }
            Binding current = findBinding(bindingId, true);
            if (current.invalidated() || !Objects.equals(discovered.owner(), current.owner())) { throw ApiFailure.unauthenticated(); }
            if(current.generation()>=9007199254740991L) { throw new ApiFailure(409,"VERSION_CONFLICT","Start a new session."); }
            if (old != null) { revokeContext(findContext(old.id(), true).id()); }
            Instant now=clock.instant(); long generation=current.generation()+1;
            Context next = new Context(UUID.randomUUID().toString(), bindingId, actorId, actor.epoch(), generation,
                    now.plus(properties.staffAbsolute()), now.plus(properties.activationTtl()), null, "PENDING");
            jdbc.update("INSERT INTO auth_session_contexts(id,binding_id,actor_id,captured_security_epoch,generation,authenticated_at,absolute_expires_at,activation_expires_at,state) VALUES(?,?,?,?,?,?,?,?, 'PENDING')",
                    next.id(), bindingId, actorId, actor.epoch(), generation, DatabaseTime.sql(now), DatabaseTime.sql(next.absolute()), DatabaseTime.sql(next.activation()));
            jdbc.update("UPDATE app_session_bindings SET current_owner_context_id=?,generation=? WHERE id=?", next.id(), generation, bindingId);
            return next;
        });
    }

    /** Pre-save validation may revoke but never activate/renew; all its locks end before the framework write. */
    public void beforeFrameworkSave(String bindingId,String contextId,Long generation) {
        if(bindingId==null) { return; }
        Context discovered=contextId==null?null:findContext(contextId,false);
        ApiFailure failure=tx.execute(status -> {
            var actor=discovered==null?null:accounts.lock(discovered.actor());
            var binding=findBinding(bindingId,true);
            var context=discovered==null?null:findContext(contextId,true);
            try {
                var actual=metadata.byPrimaryId(binding.primary()); checkAnonymous(binding,actual);
                if(context==null) {
                    if(binding.owner()!=null) { throw ApiFailure.unauthenticated(); }
                } else if(context.state().equals("PENDING")) {
                    if(!actor.active() || actor.epoch()!=context.epoch() || !context.id().equals(binding.owner())
                            || !Objects.equals(generation,context.generation()) || binding.generation()!=context.generation()
                            || !clock.instant().isBefore(context.activation()) || !clock.instant().isBefore(context.absolute())) {
                        throw ApiFailure.unauthenticated();
                    }
                } else { checkActive(binding,context,actor,actual,generation); }
                return null;
            } catch(ApiFailure denied) {
                // Commit the irreversible barrier before reporting denial, not inside a transaction that rolls back.
                if(context!=null) { revokeContext(context.id()); }
                return denied;
            }
        });
        if(failure!=null) { throw failure; }
    }

    /** Always validates successful persistence; only eligible owner requests may activate or renew authority. */
    public void confirmedSave(String sessionId, String bindingId, String contextId, Long generation, boolean ownerActivity) {
        if (bindingId == null) { return; }
        Context discovered = contextId == null ? null : findContext(contextId, false);
        tx.executeWithoutResult(status -> {
            Accounts.Account actor = discovered == null ? null : accounts.lock(discovered.actor());
            Binding binding = findBinding(bindingId, true);
            Context context = discovered == null ? null : findContext(contextId, true);
            var actual = metadata.bySessionId(sessionId);
            checkAnonymous(binding, actual);
            if (!binding.id().equals(actual.attributes().get(BINDING))) { throw ApiFailure.unauthenticated(); }
            if (context == null) {
                if (binding.owner() != null) { throw ApiFailure.unauthenticated(); }
                return;
            }
            checkMapping(binding, context, actor, actual, generation);
            Instant now=clock.instant();
            if (context.state().equals("PENDING")) {
                if (!now.isBefore(context.activation())) { throw ApiFailure.unauthenticated(); }
            } else if (!context.state().equals("ACTIVE") || context.confirmed() == null || !now.isBefore(context.confirmed())) {
                // A successful but late framework save must never resurrect a capability.
                throw ApiFailure.unauthenticated();
            }
            // Anonymous/public traffic may persist Spring idle state, but cannot activate or extend this owner.
            // This return follows every mapping, epoch, actual-row and prior-deadline check; it is not a bypass.
            if(!ownerActivity) { return; }
            Instant deadline=actual.expiresAt().isBefore(context.absolute()) ? actual.expiresAt() : context.absolute();
            jdbc.update("UPDATE auth_session_contexts SET state='ACTIVE',confirmed_idle_expires_at=? WHERE id=?",
                    DatabaseTime.sql(deadline), context.id());
        });
    }

    /** Checks the current browser without trusting its cached role or counter list. */
    public Accounts.Account requireHuman(String bindingId, String contextId, Long generation, String login) {
        if (bindingId == null || contextId == null) { throw ApiFailure.unauthenticated(); }
        Context discovered=findContext(contextId, false);
        return tx.execute(status -> {
            var actor=accounts.lock(discovered.actor());
            var binding=findBinding(bindingId, true); var context=findContext(contextId, true);
            var actual=metadata.byPrimaryId(binding.primary());
            checkActive(binding, context, actor, actual, generation);
            if (!actor.login().equals(login)) { throw ApiFailure.unauthenticated(); }
            return actor;
        });
    }

    /** Provides M02 with a transaction-participating prefix: user -> counter -> binding -> context. */
    public void lockOwners(Collection<OwnerUse> uses, String anonymousBindingId) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Owner guards require the caller's domain transaction");
        }
        var contexts=uses.stream().map(use -> findContext(use.contextId(), false)).distinct().toList();
        contexts.stream().map(Context::actor).distinct().sorted().forEach(accounts::lock);
        uses.stream().map(OwnerUse::counterId).distinct().sorted().forEach(id -> {
            var active=jdbc.query("SELECT active FROM counters WHERE id=? FOR UPDATE", (rs,n)->rs.getBoolean(1), id);
            if (active.isEmpty() || !active.getFirst()) { throw new ApiFailure(410,"REGISTRATION_ENTRY_REVOKED","Please scan again."); }
        });
        var bindingIds=new ArrayList<>(contexts.stream().map(Context::bindingId).toList());
        if (anonymousBindingId != null) { bindingIds.add(anonymousBindingId); }
        bindingIds.stream().distinct().sorted().forEach(id -> findBinding(id,true));
        contexts.stream().sorted(Comparator.comparing(Context::id)).forEach(old -> {
            var current=findContext(old.id(),true); var actor=accounts.lock(current.actor());
            var binding=findBinding(current.bindingId(),false);
            checkActive(binding,current,actor,metadata.byPrimaryId(binding.primary()),current.generation());
        });
        for (OwnerUse use : uses) {
            var context=findContext(use.contextId(),false);
            var allowed=jdbc.queryForObject("SELECT COUNT(*) FROM user_counter_permissions WHERE user_id=? AND counter_id=? AND active=TRUE", Integer.class,context.actor(),use.counterId());
            if (allowed == null || allowed != 1 || !accounts.lock(context.actor()).role().equals("COUNTER_STAFF")) {
                throw new ApiFailure(410,"REGISTRATION_ENTRY_REVOKED","Please scan again.");
            }
        }
        if (anonymousBindingId != null) { var binding=findBinding(anonymousBindingId,false); checkAnonymous(binding,metadata.byPrimaryId(binding.primary())); }
    }

    /** Establishes the single-browser revocation barrier before any framework deletion. */
    public void revokeSession(String sessionId) {
        var actual=metadata.bySessionId(sessionId);
        if (actual == null) { return; }
        var rows=jdbc.query("SELECT * FROM app_session_bindings WHERE spring_primary_id=?",this::binding,actual.primaryId());
        if (rows.isEmpty()) { return; }
        Binding discovered=rows.getFirst(); Context owner=discovered.owner()==null?null:findContext(discovered.owner(),false);
        tx.executeWithoutResult(status -> {
            if (owner!=null) { accounts.lock(owner.actor()); }
            Binding binding=findBinding(discovered.id(),true);
            if (!Objects.equals(discovered.owner(),binding.owner())) { throw ApiFailure.unauthenticated(); }
            if (owner!=null) { findContext(owner.id(),true); revokeContext(owner.id()); }
            jdbc.update("UPDATE app_session_bindings SET invalidated_at=? WHERE id=?",DatabaseTime.sql(clock.instant()),binding.id());
        });
    }

    /** Resolves only this browser's stable scope; cookie values cannot become API scope parameters. */
    public Binding anonymous(String bindingId) {
        return tx.execute(status -> {
            Binding binding=findBinding(bindingId,true); checkAnonymous(binding,metadata.byPrimaryId(binding.primary())); return binding;
        });
    }

    /** Requires both domain deadlines and the actual persisted Session projection. */
    private void checkActive(Binding binding, Context context, Accounts.Account actor, SessionMetadata.Projection actual, Long generation) {
        checkAnonymous(binding,actual); checkMapping(binding,context,actor,actual,generation);
        if (!context.state().equals("ACTIVE") || context.confirmed()==null || !clock.instant().isBefore(context.confirmed())) {
            throw ApiFailure.unauthenticated();
        }
    }

    /** Epoch and generation checks prevent stale principals and late saves from restoring authority. */
    private void checkMapping(Binding binding, Context context, Accounts.Account actor, SessionMetadata.Projection actual, Long generation) {
        if (!actor.active() || actor.epoch()!=context.epoch() || !clock.instant().isBefore(context.absolute())
                || !context.bindingId().equals(binding.id()) || !context.id().equals(binding.owner())
                || !Objects.equals(generation,context.generation()) || binding.generation()!=context.generation()
                || !actor.login().equals(actual.principal()) || !context.id().equals(actual.attributes().get(CONTEXT))
                || !Objects.equals(generation,actual.attributes().get(GENERATION)) || !binding.id().equals(actual.attributes().get(BINDING))) {
            throw ApiFailure.unauthenticated();
        }
    }

    /** Uses deadlines at request time; cleanup jobs are never the authorization authority. */
    private void checkAnonymous(Binding binding, SessionMetadata.Projection actual) {
        Instant now=clock.instant();
        if (binding.invalidated() || actual==null || !binding.primary().equals(actual.primaryId())
                || !now.isBefore(binding.anonymousDeadline()) || !now.isBefore(actual.expiresAt())) {
            throw ApiFailure.unauthenticated();
        }
    }

    /** A revoke update is irreversible for this context ID. */
    private void revokeContext(String id) { jdbc.update("UPDATE auth_session_contexts SET state='REVOKED',revoked_at=? WHERE id=?",DatabaseTime.sql(clock.instant()),id); }
    /** Reads discovered IDs first, then takes locks only at their defined place in the global order. */
    private Binding findBinding(String id, boolean lock) {
        var rows=jdbc.query("SELECT * FROM app_session_bindings WHERE id=?"+(lock?" FOR UPDATE":""),this::binding,id);
        if(rows.isEmpty()) { throw ApiFailure.unauthenticated(); } return rows.getFirst();
    }
    /** Context IDs are internal references, not bearer authorization. */
    private Context findContext(String id, boolean lock) {
        var rows=jdbc.query("SELECT * FROM auth_session_contexts WHERE id=?"+(lock?" FOR UPDATE":""),this::context,id);
        if(rows.isEmpty()) { throw ApiFailure.unauthenticated(); } return rows.getFirst();
    }
    private Binding binding(ResultSet rs,int n) throws SQLException {
        return new Binding(rs.getString("id"),rs.getString("spring_primary_id"),rs.getString("anonymous_scope_id"),
                DatabaseTime.instant(rs.getObject("anonymous_expires_at",LocalDateTime.class)),rs.getString("current_owner_context_id"),rs.getLong("generation"),rs.getObject("invalidated_at",LocalDateTime.class)!=null);
    }
    private Context context(ResultSet rs,int n) throws SQLException {
        Instant confirmed=DatabaseTime.instant(rs.getObject("confirmed_idle_expires_at",LocalDateTime.class));
        return new Context(rs.getString("id"),rs.getString("binding_id"),rs.getLong("actor_id"),rs.getLong("captured_security_epoch"),rs.getLong("generation"),
                DatabaseTime.instant(rs.getObject("absolute_expires_at",LocalDateTime.class)),DatabaseTime.instant(rs.getObject("activation_expires_at",LocalDateTime.class)),confirmed,rs.getString("state"));
    }
    /** Stable internal binding projection; controllers must never serialize it. */
    public record Binding(String id,String primary,String scope,Instant anonymousDeadline,String owner,long generation,boolean invalidated) { }
    /** Immutable discovered capability coordinates; all authority is re-read while locked. */
    public record Context(String id,String bindingId,long actor,long epoch,long generation,Instant absolute,Instant activation,Instant confirmed,String state) { }
    /** Server-resolved owner/counter pairs used by the QR module's outer transaction. */
    public record OwnerUse(String contextId,long counterId) { }
}
