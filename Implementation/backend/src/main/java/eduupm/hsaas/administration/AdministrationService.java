package eduupm.hsaas.administration;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Set;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.TransactionDefinition;
import eduupm.hsaas.auth.*;
import eduupm.hsaas.auth.AccountChanges.Proof;
import eduupm.hsaas.common.*;

/** Owns administrator commands; epoch revocation and last-admin serialization remain in the M00 mutation port. */
@Service
public class AdministrationService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final Accounts accounts;
    private final AccountChanges changes;
    private final AdminAccess access;
    private final PasswordEncoder passwords;
    private final LocalAuditPort audit;
    private final Clock clock;
    private final JsonMapper json;
    private final StaffOnboardingMail mail;
    public AdministrationService(JdbcTemplate jdbc,TransactionTemplate tx,Accounts accounts,AccountChanges changes,AdminAccess access,PasswordEncoder passwords,LocalAuditPort audit,Clock clock,JsonMapper json,StaffOnboardingMail mail) {
        this.jdbc=jdbc;this.tx=new TransactionTemplate(tx.getTransactionManager());this.tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        this.accounts=accounts;this.changes=changes;this.access=access;this.passwords=passwords;this.audit=audit;this.clock=clock;this.json=json;this.mail=mail;
    }

    /** Credentials and security epochs are excluded from the staff directory. */
    public List<UserView> users(Proof proof) {
        return tx.execute(status->{
            access.require(proof);
            return jdbc.query("""
                    SELECT id,login,role,active,version,COALESCE(full_name,login),email,
                           password_change_required,onboarding_delivery
                    FROM users ORDER BY id
                    """,(rs,n)->new UserView(Long.toString(rs.getLong(1)),rs.getString(2),rs.getString(3),
                    rs.getBoolean(4),rs.getLong(5),
                    rs.getString(6),rs.getString(7),rs.getBoolean(8),rs.getString(9)));
        });
    }

    /** The account commits before SMTP; only its hash is stored and an uncertain send is never retried automatically. */
    public Delivery create(Proof proof,CreateUser input) {
        // Require a current administrator before validation, hashing or configuration disclosure.
        access.require(proof);
        if(input==null)throw AdminInputs.invalid();
        mail.requireConfigured();
        String login=LoginNames.canonical(input.login()),role=AdminInputs.role(input.role());
        String name=AdminInputs.name(input.fullName()),email=email(input.email());
        String password=temporaryPassword(),hash=passwords.encode(password);
        long id;
        try { id=tx.execute(status->{
            jdbc.queryForObject("SELECT id FROM identity_policy_gate WHERE id=1 FOR UPDATE",Integer.class);
            accounts.lock(accounts.find(proof.login()).id()); var actor=access.require(proof);
            jdbc.update("INSERT INTO users(login,password_hash,role,active,created_at,updated_at,full_name,email,password_change_required,temporary_password_expires_at,onboarding_delivery) VALUES(?,?,?,TRUE,?,?,?,?,TRUE,?,'PENDING')",
                    login,hash,role,DatabaseTime.sql(clock.instant()),DatabaseTime.sql(clock.instant()),name,email,DatabaseTime.sql(clock.instant().plus(java.time.Duration.ofHours(24))));
            long created=jdbc.queryForObject("SELECT id FROM users WHERE login=?",Long.class,login);
            audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"USER",Long.toString(created),actor.id(),new LocalAuditPort.Snapshot(null,"ACTIVE",null,0L,"LOCAL"));
            audit.append(LocalAuditPort.Action.STAFF_EMAIL_REQUESTED,"USER",Long.toString(created),actor.id(),new LocalAuditPort.Snapshot(null,null,null,0L,"LOCAL"));
            history("USER",Long.toString(created),null,0L,"STAFF_ONBOARDING",actor.id());
            return created;
        }); } catch(DuplicateKeyException conflict) { throw new ApiFailure(409,"LOGIN_UNAVAILABLE","That login or email is already in use."); }
        return sendInitial(id,0,email,login,password);
    }

    /** Recovery is deliberate, versioned and rotates the previous temporary credential before sending a replacement. */
    public Delivery resend(Proof proof,String userId,Resend input) {
        access.require(proof);
        if(input==null)throw AdminInputs.invalid(); mail.requireConfigured();
        long id=AdminInputs.id(userId),version=AdminInputs.version(input.version());
        String password=temporaryPassword(),hash=passwords.encode(password);
        String[] recipient=tx.execute(status->{
            long actorId=accounts.find(proof.login()).id();
            java.util.stream.Stream.of(actorId,id).distinct().sorted().forEach(accounts::lock);
            var actor=access.require(proof);
            var rows=jdbc.query("SELECT login,email,active,password_change_required,version,onboarding_delivery,updated_at FROM users WHERE id=?",(rs,n)->new Object[]{rs.getString(1),rs.getString(2),rs.getBoolean(3),rs.getBoolean(4),rs.getLong(5),rs.getString(6),DatabaseTime.instant(rs.getObject(7,java.time.LocalDateTime.class))},id);
            if(rows.isEmpty())throw new ApiFailure(404,"NOT_FOUND","Account not found.");var row=rows.getFirst();
            if((long)row[4]!=version)throw new ApiFailure(409,"VERSION_CONFLICT","Reload the account before sending again.");
            if(!(boolean)row[2] || !(boolean)row[3])throw new ApiFailure(409,"PASSWORD_ALREADY_SET","Only active accounts awaiting their first password can receive an initial password.");
            if("PENDING".equals(row[5]) && ((java.time.Instant)row[6]).isAfter(clock.instant().minusSeconds(60)))
                throw new ApiFailure(409,"STAFF_EMAIL_PENDING","Wait for the current email attempt before requesting a replacement.");
            String address=email((String)row[1]);
            jdbc.update("UPDATE users SET password_hash=?,temporary_password_expires_at=?,onboarding_delivery='PENDING',security_epoch=security_epoch+1,version=version+1,updated_at=? WHERE id=?",hash,DatabaseTime.sql(clock.instant().plus(java.time.Duration.ofHours(24))),DatabaseTime.sql(clock.instant()),id);
            audit.append(LocalAuditPort.Action.STAFF_EMAIL_REQUESTED,"USER",userId,actor.id(),new LocalAuditPort.Snapshot(null,null,version,version+1,"LOCAL"));
            return new String[]{address,(String)row[0]};
        });
        return sendInitial(id,version+1,recipient[0],recipient[1],password);
    }

    /** SMTP runs without domain locks. Version fencing prevents a late send from overwriting a newer onboarding state. */
    private Delivery sendInitial(long id,long version,String email,String login,String password) {
        String delivery=mail.send(email,login,password);
        jdbc.update("UPDATE users SET onboarding_delivery=? WHERE id=? AND version=? AND password_change_required=TRUE AND onboarding_delivery='PENDING'",delivery,id,version);
        return new Delivery(true,Long.toString(id),delivery);
    }
    public boolean emailConfigured(Proof proof) { return tx.execute(status->{access.require(proof);return mail.configured();}); }
    private static String email(String value) {
        String email=value==null?null:value.strip().toLowerCase(java.util.Locale.ROOT);
        if(!StaffOnboardingMail.validEmail(email))throw AdminInputs.invalid();return email;
    }
    private static String temporaryPassword() {
        byte[] bytes=new byte[24];new java.security.SecureRandom().nextBytes(bytes);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** An empty outer transaction lets the M00 port establish its own canonical lock prefix before history is appended. */
    public void update(Proof proof,String id,UserChange input) {
        if(input==null)throw AdminInputs.invalid();
        long target=AdminInputs.id(id),version=AdminInputs.version(input.version()); String reason="ACCESS_REVIEW";
        String role=AdminInputs.role(input.role()); boolean active=AdminInputs.active(input.active());
        try { tx.executeWithoutResult(status->{var previous=snapshot("USER",id);changes.update(proof,target,version,role,active);
            if(input.fullName()!=null) jdbc.update("UPDATE users SET full_name=? WHERE id=?",AdminInputs.name(input.fullName()),target);
            if(input.email()!=null) {
                String next=input.email().isBlank()?null:email(input.email());
                String previousEmail=jdbc.queryForObject("SELECT email FROM users WHERE id=?",String.class,target);
                if(!java.util.Objects.equals(next,previousEmail))
                    jdbc.update("UPDATE users SET temporary_password_expires_at=CASE WHEN password_change_required THEN NULL ELSE temporary_password_expires_at END,onboarding_delivery=CASE WHEN password_change_required THEN 'UNKNOWN' ELSE onboarding_delivery END WHERE id=?",target);
                jdbc.update("UPDATE users SET email=? WHERE id=?",next,target);
            }
            history("USER",id,version,version+1,reason,accounts.find(proof.login()).id(),previous);}); }
        catch(DuplicateKeyException conflict) { throw new ApiFailure(409,"LOGIN_UNAVAILABLE","That login or email is already in use."); }
    }

    /** Historical references are retained; reference code is immutable after insertion and no delete command exists. */
    public List<Reference> references(Proof proof,String kind) {
        String table=table(kind);
        return tx.execute(status->{access.require(proof);return jdbc.query("SELECT id,code,name,active,version,"+(kind.equals("destinations")?"destination_kind":"NULL")+" FROM "+table+" ORDER BY id",(rs,n)->new Reference(Long.toString(rs.getLong(1)),rs.getString(2),rs.getString(3),rs.getBoolean(4),rs.getLong(5),rs.getString(6)));});
    }

    /** Destinations can be added independently of the fixed visitor form categories. */
    public void createReference(Proof proof,ReferenceCreate input) {
        if(input==null)throw AdminInputs.invalid();
        String code=AdminInputs.code(input.code()),name=AdminInputs.name(input.name()),reason=AdminInputs.reason(input.reason());
        String destinationKind=destinationKind(input.kind());
        if(code.length()>32)throw AdminInputs.invalid();
        try {tx.executeWithoutResult(status->{
            accounts.lock(accounts.find(proof.login()).id());var actor=access.require(proof);
            jdbc.update("INSERT INTO destinations(code,name,active,destination_kind) VALUES(?,?,TRUE,?)",code,name,destinationKind);
            long id=jdbc.queryForObject("SELECT id FROM destinations WHERE code=?",Long.class,code);
            audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"DESTINATION",Long.toString(id),actor.id(),new LocalAuditPort.Snapshot(null,"ACTIVE",null,0L,"LOCAL"));
            history("DESTINATION",Long.toString(id),null,0L,reason,actor.id());
        });}catch(DuplicateKeyException conflict){throw new ApiFailure(409,"CODE_UNAVAILABLE","This code is unavailable.");}
    }

    /** Single-row reference locks never call QR or registration roots; disabling preserves every historical FK and due time. */
    public void reference(Proof proof,String kind,String id,ReferenceChange input) {
        if(input==null)throw AdminInputs.invalid();
        String table=table(kind),name=AdminInputs.name(input.name()),reason=AdminInputs.reason(input.reason());long targetId=AdminInputs.id(id),version=AdminInputs.version(input.version());boolean active=AdminInputs.active(input.active());
        tx.executeWithoutResult(status->{
            accounts.lock(accounts.find(proof.login()).id());
            var previous=snapshot(target(kind),id);
            var actor=access.require(proof);
            var rows=jdbc.query("SELECT active,version FROM "+table+" WHERE id=? FOR UPDATE",(rs,n)->new Object[]{rs.getBoolean(1),rs.getLong(2)},targetId);
            if(rows.isEmpty())throw new ApiFailure(404,"NOT_FOUND","Reference not found.");
            if((long)rows.getFirst()[1]!=version)throw new ApiFailure(409,"VERSION_CONFLICT","Reload this reference.");
            if(kind.equals("destinations")) jdbc.update("UPDATE destinations SET name=?,active=?,destination_kind=?,version=version+1 WHERE id=?",name,active,destinationKind(input.kind()),targetId);
            else jdbc.update("UPDATE "+table+" SET name=?,active=?,version=version+1 WHERE id=?",name,active,targetId);
            audit.append(LocalAuditPort.Action.ADMIN_CHANGED,target(kind),id,actor.id(),new LocalAuditPort.Snapshot((boolean)rows.getFirst()[0]?"ACTIVE":"INACTIVE",active?"ACTIVE":"INACTIVE",version,version+1,"LOCAL"));
            history(target(kind),id,version,version+1,reason,actor.id(),previous);
        });
    }

    /** A null return-hours value explicitly defaults future passes to no deadline; it is never coerced to zero. */
    public List<Setting> settings(Proof proof) {
        return tx.execute(status->{access.require(proof);return jdbc.query("SELECT id,setting_key,value_int,version FROM system_settings ORDER BY id",(rs,n)->new Setting(Long.toString(rs.getLong(1)),rs.getString(2),rs.getObject(3,Integer.class),rs.getLong(4)));});
    }

    /** Changes affect future issue commands only; the assignment owner stores its chosen value and version at issue time. */
    public void setting(Proof proof,String id,String body) {
        setting(proof,id,SettingChange.parse(json,body));
    }

    /** Existing authority and setting locks serialize the expected-version check, null choice and immutable history. */
    public void setting(Proof proof,String id,SettingChange input) {
        if(input==null)throw AdminInputs.invalid();
        long targetId=AdminInputs.id(id),version=AdminInputs.version(input.version());String reason=AdminInputs.reason(input.reason());
        if(input.value()!=null && (input.value()<1 || input.value()>720))throw AdminInputs.invalid();
        tx.executeWithoutResult(status->{
            accounts.lock(accounts.find(proof.login()).id());
            var actor=access.require(proof);
            var rows=jdbc.query("SELECT setting_key,version FROM system_settings WHERE id=? FOR UPDATE",(rs,n)->new SettingKey(rs.getString(1),rs.getLong(2)),targetId);
            if(rows.isEmpty())throw new ApiFailure(404,"NOT_FOUND","Setting not found.");if(rows.getFirst().version()!=version)throw new ApiFailure(409,"VERSION_CONFLICT","Reload this setting.");
            // This endpoint cannot broaden into arbitrary security/integration settings if another catalogue is added later.
            if(!Set.of("return_hours_EXECUTIVE","return_hours_PENJAGA","return_hours_VENDOR","return_hours_CONTRACTOR").contains(rows.getFirst().key()))throw AdminInputs.invalid();
            var previous=snapshot("SETTING",id);
            jdbc.update("UPDATE system_settings SET value_int=?,version=version+1,updated_by=?,updated_at=? WHERE id=?",input.value(),actor.id(),DatabaseTime.sql(clock.instant()),targetId);
            audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"SETTING",id,actor.id(),new LocalAuditPort.Snapshot(null,null,version,version+1,"LOCAL"));
            history("SETTING",id,version,version+1,reason,actor.id(),previous);
        });
    }

    /** Fixed reason codes carry business purpose without collecting patient/staff free-text notes. */
    public void history(String kind,String id,Long previous,Long version,String reason,long actor) {
        history(kind,id,previous,version,reason,actor,null);
    }
    /** Only explicit reference/security policy fields enter immutable history; no generic entity or request serialization is used. */
    private void history(String kind,String id,Long previous,Long version,String reason,long actor,String previousValue) {
        jdbc.update("INSERT INTO administration_history(entity_kind,entity_id,previous_version,version,previous_value,current_value,reason_code,actor_id,changed_at) VALUES(?,?,?,?,?,?,?,?,?)",kind,id,previous,version,previousValue,snapshot(kind,id),reason,actor,DatabaseTime.sql(clock.instant()));
    }
    /** Nonlocking discovery before a port mutation is validated by that port's expected version before any history can commit. */
    private String snapshot(String kind,String id) {
        String query=switch(kind){case "USER"->"SELECT role,active FROM users";case "CATEGORY"->"SELECT code,name,active FROM visitor_categories";case "DESTINATION"->"SELECT code,name,active,destination_kind FROM destinations";case "SETTING"->"SELECT setting_key,value_int FROM system_settings";default->throw AdminInputs.invalid();};
        var values=jdbc.queryForList(query+" WHERE id=?",AdminInputs.id(id));
        return values.isEmpty()?null:json.writeValueAsString(values.getFirst());
    }
    /** SQL identifiers come exclusively from this allowlist, never interpolated request values. */
    private static String table(String kind){return switch(kind){case "categories"->"visitor_categories";case "destinations"->"destinations";default->throw AdminInputs.invalid();};}
    private static String target(String kind){return switch(kind){case "categories"->"CATEGORY";case "destinations"->"DESTINATION";default->throw AdminInputs.invalid();};}
    public record UserView(String id,String login,String role,boolean active,long version,String fullName,String email,boolean passwordChangeRequired,String onboardingDelivery){}
    /** Onboarding metadata is redacted from diagnostics; a password is never accepted from the client. */
    public record CreateUser(String login,String fullName,String email,String role){@Override public String toString(){return "CreateUser[REDACTED]";}}
    public record UserChange(Long version,String role,Boolean active,String fullName,String email){}
    public record Resend(Long version){}
    public record Delivery(boolean saved,String id,String emailStatus){}
    /** Only wards are eligible for Executive/Penjaga; other visitor types may select either kind. */
    private static String destinationKind(String kind){if(!Set.of("WARD","OTHER").contains(kind==null?"":kind))throw AdminInputs.invalid();return kind;}
    public record Reference(String id,String code,String name,boolean active,long version,String kind){}
    public record ReferenceCreate(String code,String name,String reason,String kind){}
    public record ReferenceChange(Long version,String name,Boolean active,String reason,String kind){}
    private record SettingKey(String key,long version){}
    public record Setting(String id,String key,Integer value,long version){}
    /** Required JSON keys distinguish a deliberate no-deadline choice from an accidentally omitted value. */
    public record SettingChange(Long version,Integer value,String reason){
        public static SettingChange parse(JsonMapper json,String input) {
            try {
                if(input==null || input.length()>512)throw AdminInputs.invalid();
                var body=json.rebuild().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
                        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build().readTree(input);
                if(body==null || !body.isObject() || body.size()!=3 || !body.has("version") || !body.has("value") || !body.has("reason"))throw AdminInputs.invalid();
                for(String field:body.propertyNames())if(!Set.of("version","value","reason").contains(field))throw AdminInputs.invalid();
                var version=body.path("version");var value=body.path("value");var reason=body.path("reason");
                if(!version.isIntegralNumber() || !version.canConvertToLong() || !reason.isString())throw AdminInputs.invalid();
                if(!value.isNull() && (!value.isIntegralNumber() || !value.canConvertToInt() || value.asInt()<1 || value.asInt()>720))throw AdminInputs.invalid();
                return new SettingChange(AdminInputs.version(version.asLong()),value.isNull()?null:value.asInt(),AdminInputs.reason(reason.asString()));
            }catch(RuntimeException failure){throw AdminInputs.invalid();}
        }
    }
}
