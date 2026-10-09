package eduupm.hsaas.registrationentry;

import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.TransactionDefinition;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.common.*;
import eduupm.hsaas.common.RestartDetails.FormContext;
import eduupm.hsaas.auth.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Complete QR servlet and lock graph runs exclusively on an owned temporary MySQL, never a developer database. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class QrMysqlTests {
    @Container static final MySQLContainer MYSQL=new MySQLContainer("mysql:8.0.45").withCommand("--log-bin-trust-function-creators=1");
    @LocalServerPort int port;
    @MockitoSpyBean JdbcTemplate jdbc;
    @Autowired JsonMapper json;
    @Autowired PasswordEncoder passwords;
    @Autowired QrEntryService entries;
    @Autowired TransactionTemplate tx;
    @Autowired SessionCapabilities capabilities;
    @Autowired AccountChanges changes;
    @Autowired IdempotencyPort commands;
    @Autowired LocalAuditPort audit;
    @Autowired LoginLimiter loginLimiter;
    @MockitoSpyBean Clock clock;
    private Instant now;
    private long staffId,adminId;
    private static final String PASSWORD="Public-synthetic-fixture_1";

    /** Every setting is explicit and secret material is public fixture data, not a file or inherited native URL. */
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url",MYSQL::getJdbcUrl);properties.add("spring.datasource.username",MYSQL::getUsername);properties.add("spring.datasource.password",MYSQL::getPassword);
        properties.add("hsaas.qr.enabled",()->"true");properties.add("hsaas.qr.origin",()->"https://entry.example.test");
        properties.add("hsaas.qr.active-key",()->"fixture");properties.add("hsaas.qr.keys.fixture",()->Base64.getEncoder().encodeToString(new byte[32]));
        properties.add("hsaas.hash-key-version",()->"fixture");properties.add("hsaas.hash-key",()->Base64.getEncoder().encodeToString(new byte[32]));
    }
    /** Only disposable fixtures are removed; circular domain pointers are cleared before their referenced rows. */
    @BeforeEach void fixtures() {
        reset(clock);now=Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);doReturn(now).when(clock).instant();
        ((Map<?,?>)org.springframework.test.util.ReflectionTestUtils.getField(loginLimiter,"buckets")).clear();
        jdbc.execute("DROP TRIGGER IF EXISTS qr_audit_failure");
        jdbc.update("DELETE FROM registration_entry_contexts");
        jdbc.update("UPDATE registration_entry_grants SET replaces_grant_id=NULL,replaces_binding_version=NULL");
        for(String table:List.of("registration_entry_grants","registration_qr_challenges","registration_qr_sessions")) { jdbc.update("DELETE FROM "+table); }
        jdbc.update("UPDATE app_session_bindings SET current_owner_context_id=NULL");
        for(String table:List.of("auth_session_contexts","app_session_bindings","SPRING_SESSION_ATTRIBUTES","SPRING_SESSION","idempotency_records","audit_events","user_counter_permissions","users","counters","visitor_categories")) { jdbc.update("DELETE FROM "+table); }
        String password=passwords.encode(PASSWORD);
        for(String role:List.of("COUNTER_STAFF","ADMIN")) {
            jdbc.update("INSERT INTO users(login,password_hash,role,active,created_at,updated_at) VALUES(?,?,?,TRUE,?,?)",role.equals("ADMIN")?"admin_qr":"staff_qr",password,role,DatabaseTime.sql(now),DatabaseTime.sql(now));
        }
        staffId=jdbc.queryForObject("SELECT id FROM users WHERE login='staff_qr'",Long.class);adminId=jdbc.queryForObject("SELECT id FROM users WHERE login='admin_qr'",Long.class);
        jdbc.update("INSERT INTO counters(id,code,name) VALUES(1,'QR_SYNTHETIC_1','Synthetic counter one'),(2,'QR_SYNTHETIC_2','Synthetic counter two')");
        jdbc.update("INSERT INTO user_counter_permissions(user_id,counter_id) VALUES(?,1),(?,2)",staffId,staffId);
        jdbc.update("INSERT INTO visitor_categories(id,code,name) VALUES(1,'PENJAGA','Synthetic Penjaga'),(2,'VENDOR','Synthetic Vendor')");
    }
    /** Real role/CSRF/session checks, headers and opaque category IDs cannot be bypassed by public requests. */
    @Test void servletRolesCsrfAndPrivacy() throws Exception {
        Browser publicBrowser=new Browser();publicBrowser.csrf();
        assertThat(publicBrowser.get("/api/public/registration-entry").statusCode()).isEqualTo(403);
        assertThat(publicBrowser.post("/api/staff/registration-qr-sessions",Map.of("counterId","1"),true).statusCode()).isEqualTo(401);
        Browser staff=staff();Browser admin=new Browser();admin.login("admin_qr");
        assertThat(admin.post("/api/staff/registration-qr-sessions",Map.of("counterId","1"),true).statusCode()).isEqualTo(403);
        assertThat(staff.post("/api/staff/registration-qr-sessions",Map.of("counterId","1"),false).statusCode()).isEqualTo(403);
        assertThat(staff.post("/api/staff/registration-qr-sessions",Map.of("counterId","1","categoryScope","PENJAGA"),true).statusCode()).isEqualTo(400);
        String id=staff.create("1",null);HttpResponse<String> current=staff.get("/api/staff/registration-qr-sessions/"+id+"/current");
        assertThat(current.statusCode()).isEqualTo(200);assertThat(current.headers().firstValue("cache-control").orElse("")).isEqualTo("no-store");
        assertThat(current.headers().firstValue("referrer-policy").orElse("")).isEqualTo("no-referrer");
        String token=token(current);assertThat(publicBrowser.post("/api/public/registration-entry/exchange",Map.of("entryToken",token),false).statusCode()).isEqualTo(403);
        var exchanged=publicBrowser.exchange(token);assertThat(exchanged.statusCode()).isEqualTo(200);
        assertThat(exchanged.body()).doesNotContain("entryToken","owner","nonce","password","MRN","phone");
        Browser other=new Browser();other.csrf();assertThat(other.get("/api/public/registration-entry").statusCode()).isEqualTo(403);
        assertThat(publicBrowser.post("/api/public/registration-entry/exchange",Map.of("entryToken",token,"counterId","2"),true).statusCode()).isEqualTo(400);
    }
    /** Two real server slots change payload, overlap for fifteen seconds, and never extend the old screenshot. */
    @Test void rotationExpiryAndIndependentVisitors() throws Exception {
        Browser staff=staff();String id=staff.create("1",null);String owner=staff.owner();
        var first=entries.current(owner,id);var again=entries.current(owner,id);assertThat(first.entryUrl().equals(again.entryUrl())).isTrue();
        String token=first.entryUrl().split("#entry=")[1];Browser one=new Browser();one.csrf();Browser two=new Browser();two.csrf();
        QrEntryService.Entry a=json.readValue(one.exchange(token).body(),QrEntryService.Entry.class);
        QrEntryService.Entry b=json.readValue(two.exchange(token).body(),QrEntryService.Entry.class);
        assertThat(a.formContext()).isNotEqualTo(b.formContext());
        advance(30);var next=entries.current(owner,id);assertThat(next.entryUrl().equals(first.entryUrl())).isFalse();
        assertThat(json.readValue(one.exchange(token).body(),QrEntryService.Entry.class).grantExpiresAt()).isEqualTo(a.grantExpiresAt());
        advance(15);assertThat(one.exchange(token).statusCode()).isEqualTo(410);
        assertThat(one.get("/api/public/registration-entry").statusCode()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registration_qr_challenges WHERE display_session_id=?",Integer.class,id)).isEqualTo(2);
    }
    /** Cancel, invalid replacement and unknown-network confirmation recovery keep the correct source and context. */
    @Test void confirmationLinkageAndCrossDisplayScope() throws Exception {
        Browser staff=staff();String firstId=staff.create("1",null),sameId=staff.create("1",null),secondId=staff.create("2","1");
        String first=token(staff.get("/api/staff/registration-qr-sessions/"+firstId+"/current"));
        String same=token(staff.get("/api/staff/registration-qr-sessions/"+sameId+"/current"));
        String second=token(staff.get("/api/staff/registration-qr-sessions/"+secondId+"/current"));
        Browser visitor=new Browser();visitor.csrf();var old=json.readValue(visitor.exchange(first).body(),QrEntryService.Entry.class);
        assertThat(json.readValue(visitor.exchange(same).body(),QrEntryService.Entry.class).formContext()).isEqualTo(old.formContext());
        var prompt=visitor.exchange(second);assertThat(prompt.statusCode()).isEqualTo(409);assertThat(prompt.body()).contains("REGISTRATION_ENTRY_RESTART_REQUIRED","details");
        assertThat(entries.entry(visitor.binding()).formContext()).isEqualTo(old.formContext());
        var bad=visitor.post("/api/public/registration-entry/exchange",Map.of("entryToken","invalid","restartConfirmed",true,"expectedFormContext",old.formContext()),true);
        assertThat(bad.statusCode()).isEqualTo(400);assertThat(entries.entry(visitor.binding()).formContext()).isEqualTo(old.formContext());
        var confirmed=visitor.confirm(second,old.formContext());assertThat(confirmed.statusCode()).isEqualTo(200);
        var fresh=json.readValue(confirmed.body(),QrEntryService.Entry.class);
        var retried=json.readValue(visitor.confirm(second,old.formContext()).body(),QrEntryService.Entry.class);
        assertThat(retried).isEqualTo(fresh);assertThat(fresh.formContext()).isNotEqualTo(old.formContext());
        assertThatThrownBy(()->tx.execute(status->entries.lockGrant(visitor.binding(),old.formContext())))
                .isInstanceOfSatisfying(ApiFailure.class,f->assertThat(f.code()).isEqualTo("REGISTRATION_ENTRY_CONTEXT_CHANGED"));
        entries.revoke(staff.owner(),firstId);assertThat(entries.entry(visitor.binding()).formContext()).isEqualTo(fresh.formContext());
        advance(45);assertThat(visitor.confirm(second,old.formContext()).statusCode()).isEqualTo(410);
        assertThat(visitor.get("/api/public/registration-entry").statusCode()).isEqualTo(200);
    }
    /** A grant survives QR expiry, but its own twenty-minute boundary never depends on cleanup. */
    @Test void absoluteGrantBoundary() throws Exception {
        Browser staff=staff();String id=staff.create("1",null);Browser visitor=new Browser();visitor.csrf();
        var value=json.readValue(visitor.exchange(token(staff.get("/api/staff/registration-qr-sessions/"+id+"/current"))).body(),QrEntryService.Entry.class);
        now=Instant.parse(value.grantExpiresAt()).minusNanos(1000);doReturn(now).when(clock).instant();
        assertThat(entries.entry(visitor.binding()).formContext()).isEqualTo(value.formContext());
        now=Instant.parse(value.grantExpiresAt());doReturn(now).when(clock).instant();
        assertThatThrownBy(()->entries.entry(visitor.binding())).isInstanceOfSatisfying(ApiFailure.class,f->assertThat(f.code()).isEqualTo("REGISTRATION_ENTRY_EXPIRED"));
    }
    /** No independent consumption transaction is permitted; an outer business failure restores pointer and grant. */
    @Test void consumptionRollbackReceiptFenceAndExactlyOnce() throws Exception {
        Browser staff=staff();String id=staff.create("1",null);Browser visitor=new Browser();visitor.csrf();
        var value=json.readValue(visitor.exchange(token(staff.get("/api/staff/registration-qr-sessions/"+id+"/current"))).body(),QrEntryService.Entry.class);
        assertThatThrownBy(()->entries.lockGrant(visitor.binding(),value.formContext())).isInstanceOf(IllegalStateException.class);
        var stale=tx.execute(status->entries.lockGrant(visitor.binding(),value.formContext()));
        assertThatThrownBy(()->tx.executeWithoutResult(status->entries.consume(stale,101))).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->tx.executeWithoutResult(status->{ var access=entries.lockGrant(visitor.binding(),value.formContext());entries.consume(access,101);throw new IllegalStateException("Synthetic rollback"); })).isInstanceOf(IllegalStateException.class);
        assertThat(entries.entry(visitor.binding()).formContext()).isEqualTo(value.formContext());
        tx.executeWithoutResult(status->{ var access=entries.lockGrant(visitor.binding(),value.formContext());entries.consume(access,101); });
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registration_entry_grants WHERE consumed_at IS NOT NULL",Integer.class)).isEqualTo(1);
        assertThatThrownBy(()->tx.executeWithoutResult(status->entries.lockGrant(visitor.binding(),value.formContext()))).isInstanceOf(ApiFailure.class);
    }
    /** Suspending the outer transaction cannot lend its receipt to REQUIRES_NEW; resumption preserves rollback/commit. */
    @Test void suspendedOuterReceiptRejectsRequiresNewBeforeSqlAndResumes() throws Exception {
        Browser staff=staff();String display=staff.create("1",null);Browser visitor=new Browser();visitor.csrf();
        var value=json.readValue(visitor.exchange(token(staff.get("/api/staff/registration-qr-sessions/"+display+"/current"))).body(),QrEntryService.Entry.class);
        String binding=visitor.binding();
        var independent=new TransactionTemplate(Objects.requireNonNull(tx.getTransactionManager()));
        independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        independent.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        independent.setTimeout(5);
        for(boolean rollback:List.of(true,false)) {
            tx.executeWithoutResult(outer->{
                var access=entries.lockGrant(binding,value.formContext());
                independent.executeWithoutResult(inner->{
                    // Bound the unfixed regression's MySQL wait; the fixed gate must call no JdbcTemplate method at all.
                    jdbc.execute("SET SESSION innodb_lock_wait_timeout=1");clearInvocations(jdbc);
                    try {
                        assertThatThrownBy(()->entries.consume(access,211)).isInstanceOf(IllegalStateException.class)
                                .hasMessage("Lock this grant in the current transaction before consuming it");
                        verifyNoInteractions(jdbc);
                    } finally { jdbc.execute("SET SESSION innodb_lock_wait_timeout=50"); }
                });
                // The same receipt is still owned by the resumed outer transaction, not spent by inner rejection.
                entries.consume(access,211);if(rollback) { outer.setRollbackOnly(); }
            });
            if(rollback) {
                assertThat(entries.entry(binding).formContext()).isEqualTo(value.formContext());
                assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registration_entry_grants WHERE consumed_at IS NOT NULL",Integer.class)).isZero();
            }
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registration_entry_grants WHERE consumed_at IS NOT NULL AND registration_id=211",Integer.class)).isEqualTo(1);
        assertThatThrownBy(()->entries.entry(binding)).isInstanceOf(ApiFailure.class);
    }
    /** Initial pointer uniqueness and replacement CAS are exercised with real competing MySQL transactions. */
    @Test void concurrentFirstExchangeAndReplace() throws Exception {
        Browser staff=staff();String id=staff.create("1",null),nextId=staff.create("2",null);
        String token=token(staff.get("/api/staff/registration-qr-sessions/"+id+"/current"));
        String next=token(staff.get("/api/staff/registration-qr-sessions/"+nextId+"/current"));
        Browser visitor=new Browser();visitor.csrf();String binding=visitor.binding();
        var first=race(()->entries.exchange(binding,new QrEntryService.ExchangeRequest(token,null,null)),()->entries.exchange(binding,new QrEntryService.ExchangeRequest(token,null,null)));
        assertThat(first.stream().filter(QrEntryService.Entry.class::isInstance).count()).isGreaterThanOrEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registration_entry_grants WHERE revoked_at IS NULL AND consumed_at IS NULL",Integer.class)).isEqualTo(1);
        var old=entries.entry(binding);
        var replacements=race(()->entries.exchange(binding,new QrEntryService.ExchangeRequest(next,true,old.formContext())),()->entries.exchange(binding,new QrEntryService.ExchangeRequest(next,true,old.formContext())));
        assertThat(replacements.stream().filter(QrEntryService.Entry.class::isInstance).count()).isGreaterThanOrEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registration_entry_grants WHERE revoked_at IS NULL AND consumed_at IS NULL",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registration_entry_grants WHERE replaces_grant_id IS NOT NULL",Integer.class)).isEqualTo(1);
    }
    /** Revocation and consumption serialize through the full prefix/display/context graph and do not deadlock. */
    @Test void revokeVersusConsumeAndLogout() throws Exception {
        Browser staff=staff();String id=staff.create("1",null);Browser visitor=new Browser();visitor.csrf();
        String token=token(staff.get("/api/staff/registration-qr-sessions/"+id+"/current"));
        var entry=json.readValue(visitor.exchange(token).body(),QrEntryService.Entry.class);String binding=visitor.binding(),owner=staff.owner();
        var results=race(()->{entries.revoke(owner,id);return true;},()->tx.execute(status->{var access=entries.lockGrant(binding,entry.formContext());entries.consume(access,111);return true;}));
        assertThat(results.stream().noneMatch(result->result instanceof org.springframework.dao.CannotAcquireLockException)).isTrue();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registration_entry_grants WHERE consumed_at IS NOT NULL",Integer.class)).isLessThanOrEqualTo(1);
        String another=staff.create("1",null);String challenge=token(staff.get("/api/staff/registration-qr-sessions/"+another+"/current"));
        Browser second=new Browser();second.csrf();second.exchange(challenge);staff.post("/api/auth/logout",Map.of(),true);
        assertThat(second.get("/api/public/registration-entry").statusCode()).isEqualTo(410);
        assertThat(second.exchange(challenge).statusCode()).isEqualTo(410);
    }
    /** Counter closure and account/permission epochs invalidate grants at use time without a Session event. */
    @Test void counterAndPermissionRevocation() throws Exception {
        Browser staff=staff(),admin=new Browser();admin.login("admin_qr");String id=staff.create("1",null);Browser visitor=new Browser();visitor.csrf();
        visitor.exchange(token(staff.get("/api/staff/registration-qr-sessions/"+id+"/current")));
        var proof=new AccountChanges.Proof(admin.binding(),admin.owner(),1L,"admin_qr");
        changes.counterPermission(proof,staffId,1,0,false);
        assertThat(visitor.get("/api/public/registration-entry").statusCode()).isEqualTo(410);
    }
    /** Expired owner metadata and early key removal fail closed, while legitimate natural key retirement preserves a form. */
    @Test void ownerExpiryAndRetainedKeyGate() throws Exception {
        Browser staff=staff();String id=staff.create("1",null);Browser visitor=new Browser();visitor.csrf();
        visitor.exchange(token(staff.get("/api/staff/registration-qr-sessions/"+id+"/current")));
        var foundation=new eduupm.hsaas.config.FoundationProperties("test","disabled","manual","disabled","disabled",false,Duration.ofMinutes(30),Duration.ofHours(8),Duration.ofHours(24),Duration.ofMinutes(1),"fixture","",Map.of());
        var keys=new QrProperties(true,"https://entry.example.test","new",Map.of("new",Base64.getEncoder().encodeToString(new byte[32])));
        var codec=new QrTokenCodec(keys,json);
        assertThatThrownBy(()->new QrEntryService(jdbc,tx,clock,capabilities,keys,foundation,codec)).isInstanceOf(IllegalStateException.class);
        advance(45);new QrEntryService(jdbc,tx,clock,capabilities,keys,foundation,codec);
        assertThat(visitor.get("/api/public/registration-entry").statusCode()).isEqualTo(200);
        jdbc.update("UPDATE auth_session_contexts SET confirmed_idle_expires_at=? WHERE id=?",DatabaseTime.sql(now),staff.owner());
        assertThat(visitor.get("/api/public/registration-entry").statusCode()).isEqualTo(410);
    }
    /** A new expired challenge cannot discard the confirmed old pending form. */
    @Test void expiredConfirmationPreservesOriginalAndWrongTransitionIsRejected() throws Exception {
        Browser staff=staff();String oldId=staff.create("1",null),newId=staff.create("2",null);
        Browser visitor=new Browser();visitor.csrf();var old=json.readValue(visitor.exchange(token(staff.get("/api/staff/registration-qr-sessions/"+oldId+"/current"))).body(),QrEntryService.Entry.class);
        String next=token(staff.get("/api/staff/registration-qr-sessions/"+newId+"/current"));
        assertThat(visitor.exchange(next).statusCode()).isEqualTo(409);advance(45);
        assertThat(visitor.confirm(next,old.formContext()).statusCode()).isEqualTo(410);
        assertThat(entries.entry(visitor.binding()).formContext()).isEqualTo(old.formContext());
        String fresh=token(staff.get("/api/staff/registration-qr-sessions/"+newId+"/current"));
        var replacement=json.readValue(visitor.confirm(fresh,old.formContext()).body(),QrEntryService.Entry.class);
        var wrong=new FormContext(UUID.randomUUID().toString(),old.formContext().bindingVersion());
        assertThat(visitor.confirm(fresh,wrong).statusCode()).isEqualTo(409);
        assertThat(entries.entry(visitor.binding()).formContext()).isEqualTo(replacement.formContext());
    }
    /** Replacement and M03 consumption compete through the same pointer; exactly one original transition wins. */
    @Test void replaceVersusConsumeAndExchangeVersusRevoke() throws Exception {
        Browser staff=staff();String oldId=staff.create("1",null),newId=staff.create("2",null);String owner=staff.owner();
        Browser visitor=new Browser();visitor.csrf();String binding=visitor.binding();
        var old=json.readValue(visitor.exchange(token(staff.get("/api/staff/registration-qr-sessions/"+oldId+"/current"))).body(),QrEntryService.Entry.class);
        String next=token(staff.get("/api/staff/registration-qr-sessions/"+newId+"/current"));
        var results=race(()->entries.exchange(binding,new QrEntryService.ExchangeRequest(next,true,old.formContext())),
                ()->tx.execute(status->{var access=entries.lockGrant(binding,old.formContext());entries.consume(access,121);return true;}));
        assertThat(results.stream().filter(ApiFailure.class::isInstance).count()).isEqualTo(1);
        String thirdId=staff.create("1",null);String thirdToken=token(staff.get("/api/staff/registration-qr-sessions/"+thirdId+"/current"));
        Browser another=new Browser();another.csrf();String anotherBinding=another.binding();
        race(()->entries.exchange(anotherBinding,new QrEntryService.ExchangeRequest(thirdToken,null,null)),()->{entries.revoke(owner,thirdId);return true;});
        assertThatThrownBy(()->entries.entry(anotherBinding)).isInstanceOf(ApiFailure.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registration_entry_grants WHERE display_session_id=? AND consumed_at IS NULL AND revoked_at IS NULL",Integer.class,thirdId)).isZero();
    }
    /** Permission mutation and logout do not use a reverse lock order against exchange. */
    @Test void permissionAndLogoutVersusExchange() throws Exception {
        Browser staff=staff(),admin=new Browser();admin.login("admin_qr");String id=staff.create("1",null);
        Browser visitor=new Browser();visitor.csrf();String binding=visitor.binding(),token=token(staff.get("/api/staff/registration-qr-sessions/"+id+"/current"));
        var proof=new AccountChanges.Proof(admin.binding(),admin.owner(),1L,"admin_qr");
        race(()->entries.exchange(binding,new QrEntryService.ExchangeRequest(token,null,null)),()->{changes.counterPermission(proof,staffId,1,0,false);return true;});
        assertThatThrownBy(()->entries.entry(binding)).isInstanceOf(ApiFailure.class);
        // A fresh login captures the new epoch and can use the still-authorized second counter.
        staff.login("staff_qr");String next=staff.create("2",null);String nextToken=token(staff.get("/api/staff/registration-qr-sessions/"+next+"/current"));
        race(()->entries.exchange(binding,new QrEntryService.ExchangeRequest(nextToken,null,null)),()->{capabilities.revokeSession(staff.sessionId());return true;});
        assertThatThrownBy(()->entries.entry(binding)).isInstanceOf(ApiFailure.class);
    }
    /** Real audit SQL failure rolls back consumption, pointer, and successful-command retention together. */
    @Test void auditFailureAndIdempotentSuccessAfterExpiry() throws Exception {
        Browser staff=staff();String id=staff.create("1",null);Browser visitor=new Browser();visitor.csrf();String binding=visitor.binding();
        var value=json.readValue(visitor.exchange(token(staff.get("/api/staff/registration-qr-sessions/"+id+"/current"))).body(),QrEntryService.Entry.class);
        var scope=new RequestEncoding.Scope(RequestEncoding.Kind.ANONYMOUS,entries.anonymous(binding).scope());
        var namespace=new IdempotencyPort.Namespace(scope,"REGISTER","REGISTER",UUID.randomUUID().toString());
        byte[] encoding=RequestEncoding.encode(json,scope,"REGISTER","REGISTER",1,List.of(RequestEncoding.Field.text("grantReference",value.formContext().grantReference()),RequestEncoding.Field.integer("bindingVersion",value.formContext().bindingVersion())));
        jdbc.execute("CREATE TRIGGER qr_audit_failure BEFORE INSERT ON audit_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'");
        assertThatThrownBy(()->tx.executeWithoutResult(status->{
            var access=entries.lockGrant(binding,value.formContext());entries.consume(access,131);
            commands.success(namespace,encoding,201,new IdempotencyPort.SafeResult("131","R_QR_SYNTHETIC","SUBMITTED",0));
            audit.append(LocalAuditPort.Action.REGISTRATION_SUBMITTED,"REGISTRATION","131",null,new LocalAuditPort.Snapshot(null,"SUBMITTED",null,0L,"LOCAL"));
        })).isInstanceOf(org.springframework.dao.DataAccessException.class);
        assertThat(entries.entry(binding).formContext()).isEqualTo(value.formContext());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_records",Integer.class)).isZero();jdbc.execute("DROP TRIGGER qr_audit_failure");
        tx.executeWithoutResult(status->{var access=entries.lockGrant(binding,value.formContext());entries.consume(access,131);commands.success(namespace,encoding,201,new IdempotencyPort.SafeResult("131","R_QR_SYNTHETIC","SUBMITTED",0));});
        advance(1200);entries.anonymous(binding);
        String replayReference=tx.execute(status->commands.replay(namespace,encoding).orElseThrow().result().reference());
        assertThat(replayReference).isEqualTo("R_QR_SYNTHETIC");
        byte[] changed=RequestEncoding.encode(json,scope,"REGISTER","REGISTER",1,List.of(RequestEncoding.Field.integer("bindingVersion",value.formContext().bindingVersion()+1)));
        assertThatThrownBy(()->tx.execute(status->commands.replay(namespace,changed))).isInstanceOfSatisfying(ApiFailure.class,f->assertThat(f.code()).isEqualTo("IDEMPOTENCY_CONFLICT"));
        Browser other=new Browser();other.csrf();var otherScope=new RequestEncoding.Scope(RequestEncoding.Kind.ANONYMOUS,entries.anonymous(other.binding()).scope());
        var otherReplay=tx.execute(status->commands.replay(new IdempotencyPort.Namespace(otherScope,"REGISTER","REGISTER",namespace.key()),encoding));
        assertThat(otherReplay).isEmpty();
    }
    /** Even owner-bearing browser cookies cannot renew staff authority through public visitor requests. */
    @Test void publicEntryDoesNotRenewStaffOwner() throws Exception {
        Browser staff=staff();String display=staff.create("1",null),owner=staff.owner();
        String token=token(staff.get("/api/staff/registration-qr-sessions/"+display+"/current"));
        LocalDateTime before=jdbc.queryForObject("SELECT confirmed_idle_expires_at FROM auth_session_contexts WHERE id=?",LocalDateTime.class,owner);
        // Move the framework millisecond timestamp observably without altering any persisted deadline.
        TimeUnit.MILLISECONDS.sleep(25);
        assertThat(staff.get("/api/public/registration-entry/capabilities").statusCode()).isEqualTo(200);
        assertThat(staff.exchange(token).statusCode()).isEqualTo(200);
        assertThat(staff.get("/api/public/registration-entry").statusCode()).isEqualTo(200);
        LocalDateTime after=jdbc.queryForObject("SELECT confirmed_idle_expires_at FROM auth_session_contexts WHERE id=?",LocalDateTime.class,owner);
        assertThat(after).isEqualTo(before);
    }
    private void advance(long seconds) { now=now.plusSeconds(seconds);doReturn(now).when(clock).instant(); }
    private Browser staff() throws Exception { Browser browser=new Browser();browser.login("staff_qr");return browser; }
    private String token(HttpResponse<String> response) { return json.readValue(response.body(),QrEntryService.Current.class).entryUrl().split("#entry=")[1]; }
    /** Bounded futures turn a database deadlock/hang into a failed test rather than indefinite execution. */
    private List<Object> race(Callable<?> one,Callable<?> two) throws Exception {
        try(var pool=Executors.newFixedThreadPool(2)) {
            CountDownLatch start=new CountDownLatch(1);List<Future<Object>> futures=new ArrayList<>();
            for(Callable<?> action:List.of(one,two)) { futures.add(pool.submit(()->{start.await();try{return action.call();}catch(ApiFailure conflict){return conflict;}})); }
            start.countDown();return List.of(futures.get(0).get(15,TimeUnit.SECONDS),futures.get(1).get(15,TimeUnit.SECONDS));
        }
    }
    /** Actual HttpOnly cookies and framework CSRF are exercised; fixture credentials never leave the owned servlet. */
    private class Browser {
        final CookieManager cookies=new CookieManager(null,CookiePolicy.ACCEPT_ALL);
        final HttpClient client=HttpClient.newBuilder().cookieHandler(cookies).build();String csrf;
        HttpResponse<String> get(String path) throws Exception { return client.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+path)).GET().build(),HttpResponse.BodyHandlers.ofString()); }
        HttpResponse<String> post(String path,Object body,boolean token) throws Exception {
            var request=HttpRequest.newBuilder(URI.create("http://localhost:"+port+path)).header("Content-Type","application/json");if(token) { request.header("X-CSRF-TOKEN",csrf); }
            return client.send(request.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
        }
        void csrf() throws Exception { csrf=json.readTree(get("/api/public/csrf").body()).path("token").asString(); }
        void login(String login) throws Exception { csrf();assertThat(post("/api/auth/login",Map.of("login",login,"password",PASSWORD),true).statusCode()).isEqualTo(200);csrf(); }
        String create(String counter,String category) throws Exception { var body=new HashMap<String,Object>();body.put("counterId",counter);body.put("categoryScope",category);var response=post("/api/staff/registration-qr-sessions",body,true);assertThat(response.statusCode()).isEqualTo(201);return json.readTree(response.body()).path("displaySessionId").asString(); }
        HttpResponse<String> exchange(String token) throws Exception { return post("/api/public/registration-entry/exchange",Map.of("entryToken",token),true); }
        HttpResponse<String> confirm(String token,FormContext old) throws Exception { return post("/api/public/registration-entry/exchange",Map.of("entryToken",token,"restartConfirmed",true,"expectedFormContext",old),true); }
        String binding() {
            String cookie=cookies.getCookieStore().getCookies().stream().filter(c->c.getName().equals("HSAAS_SESSION")).findFirst().orElseThrow().getValue();
            String session=new String(Base64.getDecoder().decode(cookie),StandardCharsets.UTF_8);
            return jdbc.queryForObject("SELECT b.id FROM app_session_bindings b JOIN SPRING_SESSION s ON s.PRIMARY_ID=b.spring_primary_id WHERE s.SESSION_ID=?",String.class,session);
        }
        String sessionId() { String value=cookies.getCookieStore().getCookies().stream().filter(c->c.getName().equals("HSAAS_SESSION")).findFirst().orElseThrow().getValue();return new String(Base64.getDecoder().decode(value),StandardCharsets.UTF_8); }
        String owner() { return jdbc.queryForObject("SELECT current_owner_context_id FROM app_session_bindings WHERE id=?",String.class,binding()); }
    }
}
