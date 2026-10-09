package eduupm.hsaas.registrationentry;

import java.security.SecureRandom;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatterBuilder;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.*;
import eduupm.hsaas.common.RestartDetails.FormContext;
import eduupm.hsaas.common.RestartDetails.Scope;
import eduupm.hsaas.config.FoundationProperties;

/** Owns server-backed QR and form authority; all decisions are current database reads under ordered locks. */
public class QrEntryService {
    private static final long MAX_VERSION=9007199254740991L;
    private static final java.time.format.DateTimeFormatter TIME=new DateTimeFormatterBuilder().appendInstant(6).toFormatter();
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final Clock clock;
    private final SessionCapabilities capabilities;
    private final QrTokenCodec tokens;
    private final String environment,origin;
    private final SecureRandom random=new SecureRandom();

    /** Checks retained keys against live challenges; deploy rotation must drain old signing authority first. */
    public QrEntryService(JdbcTemplate jdbc,TransactionTemplate tx,Clock clock,SessionCapabilities capabilities,
            QrProperties properties,FoundationProperties foundation,QrTokenCodec tokens) {
        this.jdbc=jdbc;this.tx=tx;this.clock=clock;this.capabilities=capabilities;this.tokens=tokens;
        environment=foundation.environment();origin=properties.validatedOrigin(environment).toString();
        var live=jdbc.query("SELECT DISTINCT key_version FROM registration_qr_challenges WHERE expires_at>? AND revoked_at IS NULL",
                (rs,n)->rs.getString(1),DatabaseTime.sql(clock.instant()));
        if(!tokens.keyIds().containsAll(live)) { throw new IllegalStateException("Retain QR keys until their last live challenge expires"); }
    }

    /** Creates a display only for the current actor's guarded counter and enabled category. */
    public Created create(String owner,String binding,CreateRequest request) {
        long counter=id(request.counterId()); Long category=request.categoryScope()==null?null:id(request.categoryScope());
        return tx.execute(status->{
            try { capabilities.lockOwners(List.of(new SessionCapabilities.OwnerUse(owner,counter)),null); }
            catch(ApiFailure denied) {
                // Staff object discovery hides unauthorized/closed counters; public grants retain their 410 boundary.
                if(denied.status()==410) { throw new ApiFailure(404,"NOT_FOUND","Counter not found."); }throw denied;
            }
            var coordinates=jdbc.queryForMap("SELECT actor_id,binding_id FROM auth_session_contexts WHERE id=?",owner);
            if(!binding.equals(coordinates.get("binding_id"))) { throw ApiFailure.unauthenticated(); }
            category(category);
            String display=UUID.randomUUID().toString(); Instant now=clock.instant();
            jdbc.update("INSERT INTO registration_qr_sessions(id,actor_id,owner_context_id,counter_id,category_scope,environment,created_at) VALUES(?,?,?,?,?,?,?)",
                    display,coordinates.get("actor_id"),owner,counter,category,environment,DatabaseTime.sql(now));
            return new Created(display);
        });
    }

    /** Lazily creates exactly one challenge per fixed server slot; reads cannot renew a screenshot. */
    public Current current(String owner,String displayId) {
        Display discovered=display(displayId,false); requireOwner(owner,discovered);
        return tx.execute(status->{
            guard(List.of(discovered),null); Display display=display(displayId,true); requireDisplay(display);
            category(display.category()); RotationWindow window=RotationWindow.at(display.epoch(),clock.instant());
            var existing=jdbc.query("SELECT * FROM registration_qr_challenges WHERE display_session_id=? AND rotation_slot=?",this::challenge,displayId,window.slot());
            Challenge value;
            if(existing.isEmpty()) {
                byte[] nonce=new byte[32];random.nextBytes(nonce);
                value=new Challenge(UUID.randomUUID().toString(),displayId,window.slot(),Base64.getUrlEncoder().withoutPadding().encodeToString(nonce),
                        tokens.activeKey(),window.issuedAt(),window.rotateAt(),window.expiresAt(),false);
                jdbc.update("INSERT INTO registration_qr_challenges(id,display_session_id,rotation_slot,nonce,token_version,key_version,issued_at,rotate_at,expires_at) VALUES(?,?,?,?,1,?,?,?,?)",
                        value.id(),displayId,value.slot(),value.nonce(),value.key(),DatabaseTime.sql(value.issued()),DatabaseTime.sql(value.rotate()),DatabaseTime.sql(value.expires()));
            } else { value=existing.getFirst(); }
            if(value.revoked()) { throw entryRevoked(); }
            String token=tokens.encode(new QrTokenCodec.Payload(1,value.id(),value.nonce(),TIME.format(value.expires())),value.key());
            return new Current(displayId,origin+"/register#entry="+token,scope(display),TIME.format(clock.instant()),TIME.format(value.rotate()),TIME.format(value.expires()));
        });
    }

    /** Resolves anonymous identity outside downstream transactions; only framework-assigned bindings are accepted. */
    public SessionCapabilities.Binding anonymous(String binding) {
        if(TransactionSynchronizationManager.isActualTransactionActive()) { throw new IllegalStateException("Resolve anonymous scope before the downstream domain transaction"); }
        if(binding==null) { throw required(); }
        try { return capabilities.anonymous(binding); }
        catch(ApiFailure missing) { if(missing.status()==401) { throw required(); } throw missing; }
    }

    /** Confirmation modifies old and new authority in one transaction, preserving the old form on every rollback. */
    public Entry exchange(String binding,ExchangeRequest request) {
        var anonymous=anonymous(binding); var decoded=tokens.decode(request.entryToken());
        if(request.restartConfirmed()!=null && request.restartConfirmed() && request.expectedFormContext()==null) { throw invalid(); }
        if(!Boolean.TRUE.equals(request.restartConfirmed()) && request.expectedFormContext()!=null) { throw invalid(); }
        Challenge observed=challenge(decoded.payload().cid(),false);
        verify(decoded,observed); Display target=display(observed.display(),false);
        Pointer before=pointer(anonymous.scope(),false); Grant previous=before==null || before.grant()==null?null:grant(before.grant(),false);
        var discovered=new ArrayList<Display>(List.of(target));
        if(previous!=null) { discovered.add(display(previous.display(),false)); }
        boolean observedLive=previous!=null && open(previous) && sourceActive(previous);
        return tx.execute(status->{
            // Old owners may have expired; they cannot make an already-invalid old form block a fresh entry.
            // Valid reused/replaced forms require both sources, while dead forms require only the new source.
            boolean oldLive=observedLive;
            List<Display> uses=oldLive?discovered:List.of(target);
            guard(uses,binding); lockDisplays(uses); requireDisplay(display(target.id(),false));category(target.category());
            ensurePointer(anonymous.scope()); Pointer context=pointer(anonymous.scope(),true);
            if(!samePointer(before,context)) { throw changed(); }
            Challenge fresh=challenge(observed.id(),true);verify(decoded,fresh);requireChallenge(fresh);
            Grant old=previous==null?null:grant(previous.id(),false);
            if(old!=null) { grant(old.id(),true); }
            boolean reusable=old!=null && open(old) && oldLive;
            if(reusable && Boolean.TRUE.equals(request.restartConfirmed()) && confirmationMatches(old,request.expectedFormContext(),fresh,context)) {
                return response(old);
            }
            if(Boolean.TRUE.equals(request.restartConfirmed()) && (old==null || !old.form().equals(request.expectedFormContext()))) { throw changed(); }
            if(reusable && old.scope().equals(scope(target))) { return response(old); }
            if(reusable && !Boolean.TRUE.equals(request.restartConfirmed())) {
                throw new ApiFailure(409,"REGISTRATION_ENTRY_RESTART_REQUIRED","Confirm restarting registration.",List.of(),
                        new RestartDetails(old.form(),old.scope(),scope(target)));
            }
            if(Boolean.TRUE.equals(request.restartConfirmed())) {
                if(old==null || !old.form().equals(request.expectedFormContext()) || context.version()!=request.expectedFormContext().bindingVersion()) { throw changed(); }
            }
            long version=next(context.version()); Instant now=clock.instant(); String identifier=UUID.randomUUID().toString();
            if(old!=null && old.consumed()==null && !old.revoked()) {
                jdbc.update("UPDATE registration_entry_grants SET revoked_at=? WHERE id=?",DatabaseTime.sql(now),old.id());
            }
            String replaced=Boolean.TRUE.equals(request.restartConfirmed()) && old!=null?old.id():null;
            Long replacedVersion=replaced==null?null:request.expectedFormContext().bindingVersion();
            jdbc.update("INSERT INTO registration_entry_grants(id,grant_reference,binding_version,anonymous_session_binding,anonymous_scope_id,challenge_id,display_session_id,counter_id,category_scope,environment,issued_at,expires_at,replaces_grant_id,replaces_binding_version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    identifier,identifier,version,binding,anonymous.scope(),fresh.id(),target.id(),target.counter(),target.category(),environment,
                    DatabaseTime.sql(now),DatabaseTime.sql(now.plusSeconds(1200)),replaced,replacedVersion);
            int updated=jdbc.update("UPDATE registration_entry_contexts SET current_grant_id=?,binding_version=?,updated_at=? WHERE anonymous_scope_id=? AND binding_version=?",
                    identifier,version,DatabaseTime.sql(now),anonymous.scope(),context.version());
            if(updated!=1) { throw changed(); }
            return response(grant(identifier,false));
        });
    }

    /** Reads current scope without form data; missing cookies/reference guesses cannot retrieve a form. */
    public Entry entry(String binding) {
        var anonymous=anonymous(binding);
        return tx.execute(status->response(lockGrantInternal(anonymous,null)));
    }

    /** M03 calls this after successful replay lookup and before registration writes in its existing transaction. */
    public GrantAccess lockGrant(String binding,FormContext form) {
        requireTransaction();
        // M03 resolves the stable anonymous identity before opening its transaction and passes only binding ID here.
        var rows=jdbc.query("SELECT anonymous_scope_id FROM app_session_bindings WHERE id=?",(rs,n)->rs.getString(1),binding);
        if(rows.isEmpty()) { throw required(); }
        var anonymous=new SessionCapabilities.Binding(binding,null,rows.getFirst(),null,null,0,false);
        Grant value=lockGrantInternal(anonymous,form);
        var access=new GrantAccess(value.id(),binding,value.scope(),value.form());
        // A receipt cannot cross transactions or be fabricated by another module; its exact identity is fenced.
        TransactionSynchronizationManager.bindResource(access,Boolean.TRUE);
        TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization() {
            @Override public void afterCompletion(int status) { TransactionSynchronizationManager.unbindResourceIfPossible(access); }
        });
        return access;
    }

    /** Joins M03's transaction: creation/audit/idempotency failures roll back the grant and pointer together. */
    public void consume(GrantAccess access,long registrationId) {
        requireTransaction();
        if(!TransactionSynchronizationManager.hasResource(access)) { throw new IllegalStateException("Lock this grant in the current transaction before consuming it"); }
        if(registrationId<=0) { throw invalid(); }
        Grant current=grant(access.grantId(),false);
        if(!current.binding().equals(access.bindingId()) || !current.form().equals(access.formContext())) { throw changed(); }
        requireGrant(current); Instant now=clock.instant();
        if(jdbc.update("UPDATE registration_entry_grants SET consumed_at=?,registration_id=? WHERE id=? AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at>?",
                DatabaseTime.sql(now),registrationId,current.id(),DatabaseTime.sql(now))!=1) { throw changed(); }
        if(jdbc.update("UPDATE registration_entry_contexts SET current_grant_id=NULL,binding_version=?,updated_at=? WHERE anonymous_scope_id=? AND current_grant_id=? AND binding_version=?",
                next(current.version()),DatabaseTime.sql(now),current.anonymous(),current.id(),current.version())!=1) { throw changed(); }
        TransactionSynchronizationManager.unbindResource(access);
    }

    /** Revokes only this display's unsubmitted grants; unrelated pages and replacement sources remain intact. */
    public void revoke(String owner,String displayId) {
        Display discovered=display(displayId,false); requireOwner(owner,discovered);
        tx.executeWithoutResult(status->{
            guard(List.of(discovered),null); display(displayId,true);
            List<Grant> affected=jdbc.query("SELECT * FROM registration_entry_grants WHERE display_session_id=? ORDER BY id",this::grant,displayId);
            affected.stream().map(Grant::anonymous).distinct().sorted().forEach(scope->pointer(scope,true));
            jdbc.query("SELECT id FROM registration_qr_challenges WHERE display_session_id=? ORDER BY id FOR UPDATE",(rs,n)->rs.getString(1),displayId);
            affected.stream().map(Grant::id).sorted().forEach(id->grant(id,true));
            Instant now=clock.instant();
            jdbc.update("UPDATE registration_qr_sessions SET revoked_at=COALESCE(revoked_at,?) WHERE id=?",DatabaseTime.sql(now),displayId);
            // Challenges precede grants in the global type order; display lock already excludes exchange/rotation.
            jdbc.update("UPDATE registration_qr_challenges SET revoked_at=COALESCE(revoked_at,?) WHERE display_session_id=?",DatabaseTime.sql(now),displayId);
            for(Grant value:affected) {
                if(value.consumed()!=null) { continue; }
                jdbc.update("UPDATE registration_entry_grants SET revoked_at=COALESCE(revoked_at,?) WHERE id=?",DatabaseTime.sql(now),value.id());
                Pointer context=pointer(value.anonymous(),false);
                if(context!=null && value.id().equals(context.grant())) {
                    jdbc.update("UPDATE registration_entry_contexts SET current_grant_id=NULL,binding_version=?,updated_at=? WHERE anonymous_scope_id=? AND current_grant_id=?",
                            next(context.version()),DatabaseTime.sql(now),value.anonymous(),value.id());
                }
            }
        });
    }

    /** Discovers immutable coordinates before the prefix, then fences any changed pointer without chasing locks. */
    private Grant lockGrantInternal(SessionCapabilities.Binding anonymous,FormContext expected) {
        Pointer before=pointer(anonymous.scope(),false);
        if(before==null || before.grant()==null) { throw required(); }
        Grant observed=grant(before.grant(),false); Display source=display(observed.display(),false);
        guard(List.of(source),anonymous.id());lockDisplays(List.of(source));
        Pointer current=pointer(anonymous.scope(),true);
        if(!samePointer(before,current)) { throw changed(); }
        Grant value=grant(observed.id(),true);
        if(!value.binding().equals(anonymous.id()) || !value.anonymous().equals(anonymous.scope())
                || (expected!=null && !expected.equals(value.form()))) { throw changed(); }
        requireDisplay(source);requireGrant(value);category(source.category());return value;
    }
    /** M00 owns framework metadata checks; owner expiry is mapped to a safe public QR boundary. */
    private void guard(List<Display> displays,String anonymous) {
        try { capabilities.lockOwners(displays.stream().map(d->new SessionCapabilities.OwnerUse(d.owner(),d.counter())).distinct().toList(),anonymous); }
        catch(ApiFailure denied) { if(denied.status()==401) { throw entryRevoked(); } throw denied; }
    }
    private void lockDisplays(List<Display> values) { values.stream().map(Display::id).distinct().sorted().forEach(id->display(id,true)); }
    /** Unique insert may wait, but never holds later grant locks; final pointer comparison detects the winner. */
    private void ensurePointer(String scope) {
        jdbc.update("INSERT INTO registration_entry_contexts(anonymous_scope_id,binding_version,updated_at) VALUES(?,0,?) ON DUPLICATE KEY UPDATE anonymous_scope_id=anonymous_scope_id",scope,DatabaseTime.sql(clock.instant()));
    }
    private boolean samePointer(Pointer observed,Pointer current) {
        return observed==null?current!=null && current.version()==0 && current.grant()==null:
                current!=null && observed.version()==current.version() && Objects.equals(observed.grant(),current.grant());
    }
    /** The replaced pair and exact challenge prove this transition; canonical scope alone proves nothing. */
    private boolean confirmationMatches(Grant value,FormContext expected,Challenge challenge,Pointer current) {
        if(expected==null || value.replaces()==null || value.replacedVersion()==null) { return false; }
        Grant previous=grant(value.replaces(),false);
        return previous.reference().equals(expected.grantReference()) && value.replacedVersion()==expected.bindingVersion()
                && value.challenge().equals(challenge.id()) && value.id().equals(current.grant()) && value.version()==current.version();
    }
    /** A preliminary observation is only for discovery; guards re-read actual owner state before authority is used. */
    private boolean sourceActive(Grant value) {
        Display source=display(value.display(),false);
        if(source.revoked()) { return false; }
        try { return Boolean.TRUE.equals(tx.execute(status->{ guard(List.of(source),null);return true; })); }
        catch(ApiFailure denied) { if(denied.status()==401 || denied.status()==410) { return false; }throw denied; }
    }
    private void verify(QrTokenCodec.Decoded decoded,Challenge row) {
        if(!row.key().equals(decoded.keyId()) || !row.nonce().equals(decoded.payload().n()) || !TIME.format(row.expires()).equals(decoded.payload().expiresAt())) { throw invalidToken(); }
    }
    private void requireChallenge(Challenge value) {
        if(value.revoked()) { throw new ApiFailure(410,"QR_ENTRY_REVOKED","Please scan again."); }
        if(!clock.instant().isBefore(value.expires())) { throw new ApiFailure(410,"QR_ENTRY_EXPIRED","Please scan a fresh QR."); }
    }
    private void requireGrant(Grant value) {
        if(value.consumed()!=null) { throw new ApiFailure(409,"REGISTRATION_ENTRY_USED","Registration was already submitted."); }
        if(value.revoked()) { throw entryRevoked(); }
        if(!clock.instant().isBefore(value.expires())) { throw new ApiFailure(410,"REGISTRATION_ENTRY_EXPIRED","Please scan again."); }
    }
    /** Time determines OPEN directly; a scheduler never grants authority or extends the absolute deadline. */
    private boolean open(Grant value) { return value.consumed()==null && !value.revoked() && clock.instant().isBefore(value.expires()); }
    private void requireOwner(String owner,Display value) { if(owner==null || !owner.equals(value.owner())) { throw new ApiFailure(404,"NOT_FOUND","Display not found."); } }
    private void requireDisplay(Display value) { if(value.revoked() || !environment.equals(value.environment())) { throw entryRevoked(); } }
    private void category(Long value) {
        if(value!=null && jdbc.queryForObject("SELECT COUNT(*) FROM visitor_categories WHERE id=? AND active=TRUE",Integer.class,value)!=1) { throw new ApiFailure(400,"VALIDATION_FAILED","Category is unavailable."); }
    }
    private long id(String value) {
        try { if(value==null || !value.matches("[1-9][0-9]{0,18}")) { throw new IllegalArgumentException(); } return Long.parseLong(value); }
        catch(RuntimeException invalid) { throw invalid(); }
    }
    private long next(long value) { if(value>=MAX_VERSION) { throw changed(); } return value+1; }
    private void requireTransaction() { if(!TransactionSynchronizationManager.isActualTransactionActive()) { throw new IllegalStateException("Grant port must join the caller transaction"); } }
    private Scope scope(Display value) { return new Scope(value.environment(),Long.toString(value.counter()),value.category()==null?null:Long.toString(value.category())); }
    private Entry response(Grant value) { return new Entry(value.form(),value.scope(),TIME.format(clock.instant()),TIME.format(value.expires())); }
    private ApiFailure invalid() { return new ApiFailure(400,"VALIDATION_FAILED","Check the entry request."); }
    private ApiFailure invalidToken() { return new ApiFailure(400,"QR_ENTRY_INVALID","Please scan a fresh QR."); }
    private ApiFailure required() { return new ApiFailure(403,"REGISTRATION_ENTRY_REQUIRED","Scan the counter QR to register."); }
    private ApiFailure entryRevoked() { return new ApiFailure(410,"REGISTRATION_ENTRY_REVOKED","Please scan again."); }
    private ApiFailure changed() { return new ApiFailure(409,"REGISTRATION_ENTRY_CONTEXT_CHANGED","The form changed. Check the current entry."); }

    /** Queries share the outer READ_COMMITTED transaction, avoiding stale JPA authorization caches. */
    private Display display(String id,boolean lock) { var rows=jdbc.query("SELECT * FROM registration_qr_sessions WHERE id=?"+(lock?" FOR UPDATE":""),this::display,id);if(rows.isEmpty()) { throw new ApiFailure(404,"NOT_FOUND","Display not found."); }return rows.getFirst(); }
    private Challenge challenge(String id,boolean lock) { var rows=jdbc.query("SELECT * FROM registration_qr_challenges WHERE id=?"+(lock?" FOR UPDATE":""),this::challenge,id);if(rows.isEmpty()) { throw invalidToken(); }return rows.getFirst(); }
    private Grant grant(String id,boolean lock) { var rows=jdbc.query("SELECT * FROM registration_entry_grants WHERE id=?"+(lock?" FOR UPDATE":""),this::grant,id);if(rows.isEmpty()) { throw required(); }return rows.getFirst(); }
    private Pointer pointer(String scope,boolean lock) { var rows=jdbc.query("SELECT current_grant_id,binding_version FROM registration_entry_contexts WHERE anonymous_scope_id=?"+(lock?" FOR UPDATE":""),(rs,n)->new Pointer(rs.getString(1),rs.getLong(2)),scope);return rows.isEmpty()?null:rows.getFirst(); }
    private Instant instant(ResultSet rs,String name) throws SQLException { return DatabaseTime.instant(rs.getObject(name,LocalDateTime.class)); }
    private Long nullableLong(ResultSet rs,String name) throws SQLException { long value=rs.getLong(name);return rs.wasNull()?null:value; }
    private Display display(ResultSet rs,int row) throws SQLException { return new Display(rs.getString("id"),rs.getString("owner_context_id"),rs.getLong("counter_id"),nullableLong(rs,"category_scope"),rs.getString("environment"),instant(rs,"created_at"),instant(rs,"revoked_at")!=null); }
    private Challenge challenge(ResultSet rs,int row) throws SQLException { return new Challenge(rs.getString("id"),rs.getString("display_session_id"),rs.getLong("rotation_slot"),rs.getString("nonce"),rs.getString("key_version"),instant(rs,"issued_at"),instant(rs,"rotate_at"),instant(rs,"expires_at"),instant(rs,"revoked_at")!=null); }
    private Grant grant(ResultSet rs,int row) throws SQLException { return new Grant(rs.getString("id"),rs.getString("grant_reference"),rs.getLong("binding_version"),rs.getString("anonymous_session_binding"),rs.getString("anonymous_scope_id"),rs.getString("challenge_id"),rs.getString("display_session_id"),new Scope(rs.getString("environment"),Long.toString(rs.getLong("counter_id")),nullableLong(rs,"category_scope")==null?null:Long.toString(rs.getLong("category_scope"))),instant(rs,"expires_at"),instant(rs,"consumed_at"),instant(rs,"revoked_at")!=null,rs.getString("replaces_grant_id"),nullableLong(rs,"replaces_binding_version")); }

    /** Wire IDs remain opaque strings; only bindingVersion is a safe JSON integer. */
    public record CreateRequest(String counterId,String categoryScope) { }
    public record Created(String displaySessionId) { }
    public record Current(String displaySessionId,String entryUrl,Scope scope,String serverNow,String rotateAt,String expiresAt) { }
    /** Suppresses token-bearing request diagnostics even if a caller formats this object. */
    public record ExchangeRequest(String entryToken,Boolean restartConfirmed,FormContext expectedFormContext) { @Override public String toString() { return "ExchangeRequest[REDACTED]"; } }
    public record Entry(FormContext formContext,Scope scope,String serverNow,String grantExpiresAt) { }
    /** Internal receipt proves port context; never expose it as a bearer or accept it from HTTP. */
    public static final class GrantAccess {
        private final String grantId,bindingId;
        private final Scope scope;
        private final FormContext formContext;
        private GrantAccess(String grantId,String bindingId,Scope scope,FormContext formContext) {
            this.grantId=grantId;this.bindingId=bindingId;this.scope=scope;this.formContext=formContext;
        }
        public String grantId() { return grantId; }
        public String bindingId() { return bindingId; }
        public Scope scope() { return scope; }
        public FormContext formContext() { return formContext; }
    }
    private record Display(String id,String owner,long counter,Long category,String environment,Instant epoch,boolean revoked) { }
    private record Challenge(String id,String display,long slot,String nonce,String key,Instant issued,Instant rotate,Instant expires,boolean revoked) { }
    private record Pointer(String grant,long version) { }
    private record Grant(String id,String reference,long version,String binding,String anonymous,String challenge,String display,Scope scope,Instant expires,Instant consumed,boolean revoked,String replaces,Long replacedVersion) { FormContext form() { return new FormContext(reference,version); } }
}
