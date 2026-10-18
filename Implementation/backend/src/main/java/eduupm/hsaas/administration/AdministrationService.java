package eduupm.hsaas.administration;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.List;
import java.util.Map;
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
    public AdministrationService(JdbcTemplate jdbc,TransactionTemplate tx,Accounts accounts,AccountChanges changes,AdminAccess access,PasswordEncoder passwords,LocalAuditPort audit,Clock clock,JsonMapper json) {
        this.jdbc=jdbc;this.tx=new TransactionTemplate(tx.getTransactionManager());this.tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        this.accounts=accounts;this.changes=changes;this.access=access;this.passwords=passwords;this.audit=audit;this.clock=clock;this.json=json;
    }

    /** Credentials and security epochs are excluded by SQL projection, even for administrators. */
    public List<UserView> users(Proof proof) {
        return tx.execute(status->{ access.require(proof); return jdbc.query("SELECT id,login,role,active,version FROM users ORDER BY id",(rs,n)->
            new UserView(Long.toString(rs.getLong(1)),rs.getString(2),rs.getString(3),rs.getBoolean(4),rs.getLong(5),
                jdbc.query("SELECT counter_id,active,version FROM user_counter_permissions WHERE user_id=? ORDER BY counter_id",(p,i)->new Permission(Long.toString(p.getLong(1)),p.getBoolean(2),p.getLong(3)),rs.getLong(1)))); });
    }

    /** Hashing happens before domain locks; uniqueness failures roll back the complete creation and audit. */
    public void create(Proof proof,CreateUser input) {
        if(input==null)throw AdminInputs.invalid();
        String login=LoginNames.canonical(input.login()); String role=AdminInputs.role(input.role()); String reason=AdminInputs.reason(input.reason());
        if(input.password()==null || input.password().length()<12 || input.password().getBytes(StandardCharsets.UTF_8).length>72) throw AdminInputs.invalid();
        String hash=passwords.encode(input.password());
        try { tx.executeWithoutResult(status->{
            jdbc.queryForObject("SELECT id FROM identity_policy_gate WHERE id=1 FOR UPDATE",Integer.class);
            accounts.lock(accounts.find(proof.login()).id()); var actor=access.require(proof);
            jdbc.update("INSERT INTO users(login,password_hash,role,active,created_at,updated_at) VALUES(?,?,?,TRUE,?,?)",login,hash,role,DatabaseTime.sql(clock.instant()),DatabaseTime.sql(clock.instant()));
            long id=jdbc.queryForObject("SELECT id FROM users WHERE login=?",Long.class,login);
            audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"USER",Long.toString(id),actor.id(),new LocalAuditPort.Snapshot(null,"ACTIVE",null,0L,"LOCAL"));
            history("USER",Long.toString(id),null,0L,reason,actor.id());
        }); } catch(DuplicateKeyException conflict) { throw new ApiFailure(409,"LOGIN_UNAVAILABLE","This login is unavailable."); }
    }

    /** An empty outer transaction lets the M00 port establish its own canonical lock prefix before history is appended. */
    public void update(Proof proof,String id,UserChange input) {
        if(input==null)throw AdminInputs.invalid();
        long target=AdminInputs.id(id),version=AdminInputs.version(input.version()); String reason=AdminInputs.reason(input.reason());
        String role=AdminInputs.role(input.role()); boolean active=AdminInputs.active(input.active());
        tx.executeWithoutResult(status->{var previous=snapshot("USER",id);changes.update(proof,target,version,role,active);history("USER",id,version,version+1,reason,accounts.find(proof.login()).id(),previous);});
    }

    /** Permission version zero means no existing grant; every change revokes the affected account's old sessions. */
    public void permission(Proof proof,String id,String counterId,PermissionChange input) {
        if(input==null)throw AdminInputs.invalid();
        long target=AdminInputs.id(id),counter=AdminInputs.id(counterId),version=AdminInputs.version(input.version());
        String reason=AdminInputs.reason(input.reason());boolean active=AdminInputs.active(input.active());
        tx.executeWithoutResult(status->{var previous=snapshot("PERMISSION",id+":"+counterId);changes.counterPermission(proof,target,counter,version,active);history("PERMISSION",id+":"+counterId,version,version+1,reason,accounts.find(proof.login()).id(),previous);});
    }

    /** Historical references are retained; reference code is immutable after insertion and no delete command exists. */
    public List<Reference> references(Proof proof,String kind) {
        String table=table(kind);
        return tx.execute(status->{access.require(proof);return jdbc.query("SELECT id,code,name,active,version FROM "+table+" ORDER BY id",(rs,n)->new Reference(Long.toString(rs.getLong(1)),rs.getString(2),rs.getString(3),rs.getBoolean(4),rs.getLong(5)));});
    }

    /** Four form categories are fixed by M03; wards and counters can be added without inventing a fifth form schema. */
    public void createReference(Proof proof,String kind,ReferenceCreate input) {
        if(input==null)throw AdminInputs.invalid();
        String table=table(kind); if(kind.equals("categories")) throw AdminInputs.invalid();
        String code=AdminInputs.code(input.code()),name=AdminInputs.name(input.name()),reason=AdminInputs.reason(input.reason());
        try {tx.executeWithoutResult(status->{
            accounts.lock(accounts.find(proof.login()).id());var actor=access.require(proof);
            jdbc.update("INSERT INTO "+table+"(code,name,active) VALUES(?,?,TRUE)",code,name);
            long id=jdbc.queryForObject("SELECT id FROM "+table+" WHERE code=?",Long.class,code);
            audit.append(LocalAuditPort.Action.ADMIN_CHANGED,target(kind),Long.toString(id),actor.id(),new LocalAuditPort.Snapshot(null,"ACTIVE",null,0L,"LOCAL"));
            history(target(kind),Long.toString(id),null,0L,reason,actor.id());
        });}catch(DuplicateKeyException conflict){throw new ApiFailure(409,"CODE_UNAVAILABLE","This code is unavailable.");}
    }

    /** Single-row reference locks never call QR or registration roots; disabling preserves every historical FK and due time. */
    public void reference(Proof proof,String kind,String id,ReferenceChange input) {
        if(input==null)throw AdminInputs.invalid();
        String table=table(kind),name=AdminInputs.name(input.name()),reason=AdminInputs.reason(input.reason());long targetId=AdminInputs.id(id),version=AdminInputs.version(input.version());boolean active=AdminInputs.active(input.active());
        tx.executeWithoutResult(status->{
            accounts.lock(accounts.find(proof.login()).id());
            var previous=snapshot(target(kind),id);
            // Counter changes retain M00's counter-before-capability prefix; other references follow capability-before-reference.
            if(kind.equals("counters")) changes.counterActive(proof,targetId,version,active);
            var actor=access.require(proof);
            var rows=jdbc.query("SELECT active,version FROM "+table+" WHERE id=? FOR UPDATE",(rs,n)->new Object[]{rs.getBoolean(1),rs.getLong(2)},targetId);
            if(rows.isEmpty())throw new ApiFailure(404,"NOT_FOUND","Reference not found.");
            if((long)rows.getFirst()[1]!=(kind.equals("counters")?version+1:version))throw new ApiFailure(409,"VERSION_CONFLICT","Reload this reference.");
            if(kind.equals("counters")) jdbc.update("UPDATE counters SET name=? WHERE id=?",name,targetId);
            else {
                jdbc.update("UPDATE "+table+" SET name=?,active=?,version=version+1 WHERE id=?",name,active,targetId);
                audit.append(LocalAuditPort.Action.ADMIN_CHANGED,target(kind),id,actor.id(),new LocalAuditPort.Snapshot((boolean)rows.getFirst()[0]?"ACTIVE":"INACTIVE",active?"ACTIVE":"INACTIVE",version,version+1,"LOCAL"));
            }
            history(target(kind),id,version,version+1,reason,actor.id(),previous);
        });
    }

    /** One typed integer catalogue intentionally cannot change disabled integrations, session security or retention policy. */
    public List<Setting> settings(Proof proof) {
        return tx.execute(status->{access.require(proof);return jdbc.query("SELECT id,setting_key,value_int,version FROM system_settings ORDER BY id",(rs,n)->new Setting(Long.toString(rs.getLong(1)),rs.getString(2),rs.getInt(3),rs.getLong(4)));});
    }

    /** Changes affect future issue commands only; the assignment owner stores its chosen value and version at issue time. */
    public void setting(Proof proof,String id,SettingChange input) {
        if(input==null)throw AdminInputs.invalid();
        long targetId=AdminInputs.id(id),version=AdminInputs.version(input.version());String reason=AdminInputs.reason(input.reason());
        if(input.value()==null || input.value()<1 || input.value()>720)throw AdminInputs.invalid();
        tx.executeWithoutResult(status->{
            accounts.lock(accounts.find(proof.login()).id());
            var actor=access.require(proof);
            var rows=jdbc.query("SELECT version FROM system_settings WHERE id=? FOR UPDATE",(rs,n)->rs.getLong(1),targetId);
            if(rows.isEmpty())throw new ApiFailure(404,"NOT_FOUND","Setting not found.");if(rows.getFirst()!=version)throw new ApiFailure(409,"VERSION_CONFLICT","Reload this setting.");
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
        List<Map<String,Object>> values;
        if(kind.equals("PERMISSION")) {var ids=id.split(":");values=jdbc.queryForList("SELECT active FROM user_counter_permissions WHERE user_id=? AND counter_id=?",AdminInputs.id(ids[0]),AdminInputs.id(ids[1]));}
        else {
            String query=switch(kind){case "USER"->"SELECT role,active FROM users";case "CATEGORY"->"SELECT code,name,active FROM visitor_categories";case "DESTINATION"->"SELECT code,name,active FROM destinations";case "COUNTER"->"SELECT code,name,active FROM counters";case "SETTING"->"SELECT setting_key,value_int FROM system_settings";default->throw AdminInputs.invalid();};
            values=jdbc.queryForList(query+" WHERE id=?",AdminInputs.id(id));
        }
        return values.isEmpty()?null:json.writeValueAsString(values.getFirst());
    }
    /** SQL identifiers come exclusively from this allowlist, never interpolated request values. */
    private static String table(String kind){return switch(kind){case "categories"->"visitor_categories";case "destinations"->"destinations";case "counters"->"counters";default->throw AdminInputs.invalid();};}
    private static String target(String kind){return switch(kind){case "categories"->"CATEGORY";case "destinations"->"DESTINATION";case "counters"->"COUNTER";default->throw AdminInputs.invalid();};}
    public record Permission(String counterId,boolean active,long version){}
    public record UserView(String id,String login,String role,boolean active,long version,List<Permission> permissions){}
    /** The password-bearing request cannot leak through accidental diagnostic formatting. */
    public record CreateUser(String login,String password,String role,String reason){@Override public String toString(){return "CreateUser[REDACTED]";}}
    public record UserChange(Long version,String role,Boolean active,String reason){}
    public record PermissionChange(Long version,Boolean active,String reason){}
    public record Reference(String id,String code,String name,boolean active,long version){}
    public record ReferenceCreate(String code,String name,String reason){}
    public record ReferenceChange(Long version,String name,Boolean active,String reason){}
    public record Setting(String id,String key,int value,long version){}
    public record SettingChange(Long version,Integer value,String reason){}
}
