package eduupm.hsaas;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import eduupm.hsaas.auth.*;
import eduupm.hsaas.common.*;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.session.Session;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;

/** Runs real servlet/session filters against ephemeral MySQL with no developer-database fallback. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class HsaasBackendApplicationTests {
    // Disposable MySQL permits test-only failure triggers; production permissions stay unchanged.
    @Container static final MySQLContainer MYSQL=new MySQLContainer("mysql:8.0.45")
        .withCommand("--log-bin-trust-function-creators=1");
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder passwords;
    @Autowired JsonMapper json;
    @Autowired SessionCapabilities capabilities;
    @Autowired TransactionTemplate tx;
    @jakarta.persistence.PersistenceContext jakarta.persistence.EntityManager entities;
    @Autowired AccountChanges changes;
    @Autowired BootstrapService bootstrap;
    @Autowired LocalAuditPort audit;
    @Autowired IdempotencyPort commands;
    @Autowired LoginLimiter limiter;
    @Autowired @org.springframework.beans.factory.annotation.Qualifier("requestMappingHandlerMapping")
    org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping mappings;
    @MockitoSpyBean GuardedSessionRepository sessions;
    @MockitoSpyBean Accounts accountLoader;
    @MockitoSpyBean SessionCapabilities capabilityHooks;
    private long adminId,staffId;
    private static final String FIXTURE_PASSWORD="Synthetic-only-password_1";

    /** All database credentials and the mapped port belong exclusively to the container. */
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url",MYSQL::getJdbcUrl);
        properties.add("spring.datasource.username",MYSQL::getUsername);
        properties.add("spring.datasource.password",MYSQL::getPassword);
        // This public deterministic fixture is never a deployment key.
        properties.add("hsaas.hash-key-version",()->"test-v1");
        properties.add("hsaas.hash-key",()->Base64.getEncoder().encodeToString(new byte[32]));
    }

    /** Removes only disposable-container fixtures; no native database can be reached by this test class. */
    @BeforeEach void fixtures() {
        reset(sessions,accountLoader,capabilityHooks);
        ((Map<?,?>)ReflectionTestUtils.getField(limiter,"buckets")).clear();
        jdbc.update("UPDATE app_session_bindings SET current_owner_context_id=NULL");
        for(String table:List.of("auth_session_contexts","app_session_bindings","SPRING_SESSION_ATTRIBUTES","SPRING_SESSION","idempotency_records","audit_events","user_counter_permissions","users","counters")) {
            jdbc.update("DELETE FROM "+table);
        }
        jdbc.update("UPDATE bootstrap_state SET completed=FALSE");
        String hash=passwords.encode(FIXTURE_PASSWORD);
        for(String role:List.of("ADMIN","COUNTER_STAFF")) {
            String login=role.equals("ADMIN")?"admin_test":"staff_test";
            jdbc.update("INSERT INTO users(login,password_hash,role,active,created_at,updated_at) VALUES(?,?,?,TRUE,?,?)",login,hash,role,DatabaseTime.sql(Instant.now()),DatabaseTime.sql(Instant.now()));
        }
        adminId=jdbc.queryForObject("SELECT id FROM users WHERE login='admin_test'",Long.class);
        staffId=jdbc.queryForObject("SELECT id FROM users WHERE login='staff_test'",Long.class);
        jdbc.update("INSERT INTO counters(id,code,name) VALUES(1,'SYNTHETIC_1','Synthetic counter')");
        jdbc.update("INSERT INTO user_counter_permissions(user_id,counter_id) VALUES(?,1)",staffId);
    }

    /** Proves clean migration history and readiness against actual MySQL. */
    @Test void contextLoads() throws Exception {
        var response=HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/health")).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("UP");
        // V4 adds the QR domain without changing the immutable foundation migrations.
        // V5 adds the approved synthetic registration parent without changing the original foundation migrations.
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE success=TRUE",Integer.class)).isEqualTo(5);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users",Integer.class)).isEqualTo(2);
    }

    /** Exercises the real Session filter, fixation protection, CSRF rotation, wire IDs, and logout. */
    @Test void loginSessionCsrfAndLogout() throws Exception {
        Browser browser=new Browser(); browser.csrf(); String oldId=browser.sessionId(); String oldToken=browser.token;
        var login=browser.post("/api/auth/login",Map.of("login"," STAFF_TEST ","password",FIXTURE_PASSWORD),true);
        assertThat(login.statusCode()).isEqualTo(200);
        Map<String,Object> body=body(login);
        assertThat(body.get("id")).isEqualTo(Long.toString(staffId));
        assertThat(body.get("counterIds")).isEqualTo(List.of("1"));
        assertThat(browser.sessionId().equals(oldId)).isFalse();
        assertThat(browser.get("/api/auth/me").statusCode()).isEqualTo(200);
        browser.token=oldToken;
        assertThat(browser.post("/api/auth/logout",Map.of(),true).statusCode()).isEqualTo(403);
        browser.csrf();
        assertThat(browser.post("/api/auth/logout",Map.of(),true).statusCode()).isEqualTo(204);
        assertThat(browser.get("/api/auth/me").statusCode()).isEqualTo(401);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auth_session_contexts WHERE state='ACTIVE'",Integer.class)).isZero();
    }

    /** Default CSRF and role checks apply before any protected business endpoint is reached. */
    @Test void authorizationAndSafeErrors() throws Exception {
        Browser browser=new Browser();
        assertThat(browser.get("/api/auth/me").statusCode()).isEqualTo(401);
        assertThat(browser.post("/api/auth/login",Map.of("login","staff_test","password",FIXTURE_PASSWORD),false).statusCode()).isEqualTo(403);
        browser.login("admin_test");
        var denied=browser.get("/api/staff/registrations");
        assertThat(denied.statusCode()).isEqualTo(403);
        assertThat(body(denied).get("code")).isEqualTo("ACCESS_DENIED");
        assertThat(body(denied).get("fieldErrors")).isEqualTo(List.of());
        assertThat(denied.body()).doesNotContain(FIXTURE_PASSWORD,"SQLException","stackTrace");
        assertThat(browser.get("/api/admin/integrations").statusCode()).isEqualTo(200);
        browser.csrf();
        assertThat(browser.post("/api/admin/blockchain-proofs/1/verify",Map.of(),true).statusCode()).isEqualTo(409);
        assertThat(browser.post("/api/integrations/whatsapp/webhook",Map.of(),false).statusCode()).isEqualTo(409);
        assertThat(browser.post("/api/device/scan-jobs/claim",Map.of(),false).statusCode()).isEqualTo(409);
    }

    /** Decoded endpoint aliases cannot skip the current-owner or disabled-machine filters. */
    @Test void encodedPathsKeepSecurityGuards() throws Exception {
        Browser browser=new Browser(); browser.login("admin_test");
        assertThat(browser.get("/%61pi/admin/integrations").statusCode()).isEqualTo(200);
        assertThat(browser.post("/%61pi/integrations/whatsapp/webhook",Map.of(),false).statusCode()).isEqualTo(409);
        jdbc.update("UPDATE users SET security_epoch=security_epoch+1 WHERE id=?",adminId);
        var response=browser.get("/%61pi/admin/integrations");
        assertThat(response.statusCode()).isEqualTo(401);
        assertThat(body(response).get("code")).isEqualTo("AUTHENTICATION_REQUIRED");
    }

    /** Credentials never reveal whether an account exists, is disabled, or has the wrong password. */
    @Test void invalidCredentialsAndStrictInput() throws Exception {
        Browser browser=new Browser(); browser.csrf();
        for(String login:List.of("unknown_test","staff_test")) {
            var response=browser.post("/api/auth/login",Map.of("login",login,"password","Incorrect fixture"),true);
            assertThat(response.statusCode()).isEqualTo(401);
            assertThat(body(response).get("code")).isEqualTo("INVALID_CREDENTIALS");
        }
        jdbc.update("UPDATE users SET active=FALSE WHERE id=?",staffId);
        assertThat(browser.post("/api/auth/login",Map.of("login","staff_test","password",FIXTURE_PASSWORD),true).statusCode()).isEqualTo(401);
        assertThat(browser.post("/api/auth/login",Map.of("login","a@b","password",FIXTURE_PASSWORD),true).statusCode()).isEqualTo(400);
        assertThat(browser.post("/api/auth/login",Map.of("login","staff_test","password",FIXTURE_PASSWORD,"role","ADMIN"),true).statusCode()).isEqualTo(400);
        assertThat(browser.raw("/api/auth/login","{\"login\":\"admin_test\",\"login\":\"staff_test\",\"password\":\"x\"}",true).statusCode()).isEqualTo(400);
    }

    /** Two independent browsers retain separate owner contexts when one logs out. */
    @Test void logoutRevokesOnlyOneOwner() throws Exception {
        Browser first=new Browser(),second=new Browser(); first.login("staff_test"); second.login("staff_test");
        first.csrf(); first.post("/api/auth/logout",Map.of(),true);
        assertThat(first.get("/api/auth/me").statusCode()).isEqualTo(401);
        assertThat(second.get("/api/auth/me").statusCode()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auth_session_contexts WHERE state='ACTIVE'",Integer.class)).isEqualTo(1);
    }

    /** Epoch changes revoke cached role/counter claims and block old saves even if the framework row remains. */
    @Test void permissionRevocationAndLastAdministrator() throws Exception {
        Browser admin=new Browser(),staff=new Browser(); admin.login("admin_test"); staff.login("staff_test");
        Session stale=sessions.findById(staff.sessionId());
        var proof=proof(admin,"admin_test");
        assertThatThrownBy(()->changes.update(proof,adminId,0,"COUNTER_STAFF",true)).isInstanceOf(ApiFailure.class);
        changes.counterPermission(proof,staffId,1,0,false);
        assertThat(staff.get("/api/auth/me").statusCode()).isEqualTo(401);
        assertThatThrownBy(()->sessions.save(stale)).isInstanceOf(ApiFailure.class);
        assertThat(admin.get("/api/auth/me").statusCode()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_events",Integer.class)).isEqualTo(1);
    }

    /** Actual framework expiry cannot be bypassed by an otherwise future copied domain deadline. */
    @Test void frameworkExpiryAndLateSaveCannotRevive() throws Exception {
        Browser browser=new Browser(); browser.login("staff_test"); Session stale=sessions.findById(browser.sessionId());
        jdbc.update("UPDATE SPRING_SESSION SET EXPIRY_TIME=? WHERE SESSION_ID=?",Instant.now().minusSeconds(1).toEpochMilli(),browser.sessionId());
        assertThat(browser.get("/api/auth/me").statusCode()).isEqualTo(401);
        assertThatThrownBy(()->sessions.save(stale)).isInstanceOf(ApiFailure.class);
        assertThat(jdbc.queryForObject("SELECT state FROM auth_session_contexts WHERE actor_id=?",String.class,staffId)).isEqualTo("REVOKED");
    }

    /** The old confirmed deadline is irreversible even if a delayed save would make the framework expiry later. */
    @Test void confirmedDeadlineAndAbsoluteBoundary() throws Exception {
        Browser browser=new Browser(); browser.login("staff_test"); Session stale=sessions.findById(browser.sessionId());
        jdbc.update("UPDATE auth_session_contexts SET confirmed_idle_expires_at=? WHERE actor_id=?",DatabaseTime.sql(Instant.now().minusSeconds(1)),staffId);
        assertThatThrownBy(()->sessions.save(stale)).isInstanceOf(ApiFailure.class);
        assertThat(browser.get("/api/auth/me").statusCode()).isEqualTo(401);
    }

    /** Explicit login-save failure never activates its prepared context or returns login success. */
    @Test void explicitSaveFailureKeepsPending() throws Exception {
        Browser browser=new Browser(); browser.csrf();
        doThrow(new DataAccessResourceFailureException("synthetic save failure")).when(sessions).save(any(Session.class));
        var response=browser.post("/api/auth/login",Map.of("login","staff_test","password",FIXTURE_PASSWORD),true);
        assertThat(response.statusCode()).isEqualTo(503);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auth_session_contexts WHERE state='ACTIVE'",Integer.class)).isZero();
        assertThat(response.headers().allValues("Set-Cookie")).isEmpty();
    }

    /** Response buffering prevents an automatic request-end save failure from masquerading as login success. */
    @Test void requestEndSaveFailureIsNotLoginSuccess() throws Exception {
        Browser browser=new Browser(); browser.csrf(); var calls=new AtomicInteger();
        doAnswer(invocation->{ if(calls.incrementAndGet()==2) { throw new DataAccessResourceFailureException("synthetic end save failure"); } return invocation.callRealMethod(); }).when(sessions).save(any(Session.class));
        var response=browser.post("/api/auth/login",Map.of("login","staff_test","password",FIXTURE_PASSWORD),true);
        assertThat(response.statusCode()).isEqualTo(503);
        assertThat(response.headers().allValues("Set-Cookie")).isEmpty();
    }

    /** A framework deletion failure occurs after the durable application barrier. */
    @Test void logoutBarrierSurvivesFrameworkDeleteFailure() throws Exception {
        Browser browser=new Browser(); browser.login("staff_test"); String id=browser.sessionId(); browser.csrf();
        doAnswer(invocation->{ capabilities.revokeSession(invocation.getArgument(0)); throw new DataAccessResourceFailureException("synthetic delete failure"); }).when(sessions).deleteById(id);
        assertThat(browser.post("/api/auth/logout",Map.of(),true).statusCode()).isEqualTo(503);
        assertThat(browser.get("/api/auth/me").statusCode()).isEqualTo(401);
    }

    /** Owner use holds the same principal/counter/binding/context prefix as logout, without refreshing owner expiry. */
    @Test void ownerGuardAndLogoutCompetition() throws Exception {
        Browser browser=new Browser(); browser.login("staff_test");
        String context=jdbc.queryForObject("SELECT id FROM auth_session_contexts WHERE actor_id=?",String.class,staffId);
        String sessionId=browser.sessionId(); var entered=new CountDownLatch(1); var release=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var use=pool.submit(()->tx.execute(status->{ capabilities.lockOwners(List.of(new SessionCapabilities.OwnerUse(context,1)),null); entered.countDown(); await(release); return true; }));
            assertThat(entered.await(5,TimeUnit.SECONDS)).isTrue();
            var logout=pool.submit(()->{ capabilities.revokeSession(sessionId); return true; });
            assertThat(logout.isDone()).isFalse(); release.countDown();
            assertThat(use.get(5,TimeUnit.SECONDS)).isTrue(); assertThat(logout.get(5,TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(()->tx.execute(status->{ capabilities.lockOwners(List.of(new SessionCapabilities.OwnerUse(context,1)),null); return null; })).isInstanceOf(ApiFailure.class);
        }
    }

    /** Framework saving inside a domain transaction is rejected before REQUIRES_NEW can self-block. */
    @Test void savingWhileDomainLockedIsRejected() throws Exception {
        Browser browser=new Browser(); browser.login("staff_test"); Session current=sessions.findById(browser.sessionId());
        assertThatThrownBy(()->tx.execute(status->{ sessions.save(current); return null; })).isInstanceOf(IllegalStateException.class);
    }

    /** JDBC session state remains authoritative when retrieved on another request/thread. */
    @Test void rotationKeepsStablePrimaryAndRetrieval() throws Exception {
        Browser browser=new Browser(); browser.csrf(); String old=browser.sessionId();
        String primary=jdbc.queryForObject("SELECT PRIMARY_ID FROM SPRING_SESSION WHERE SESSION_ID=?",String.class,old);
        browser.post("/api/auth/login",Map.of("login","staff_test","password",FIXTURE_PASSWORD),true);
        assertThat(jdbc.queryForObject("SELECT PRIMARY_ID FROM SPRING_SESSION WHERE SESSION_ID=?",String.class,browser.sessionId())).isEqualTo(primary);
        assertThat(sessions.findById(old)).isNull();
        assertThat(sessions.findById(browser.sessionId())).isNotNull();
    }

    /** HMAC results, audit, and business writes roll back as one unit; a successful retry does not append twice. */
    @Test void auditAndIdempotencyAtomicity() {
        var namespace=new IdempotencyPort.Namespace(new RequestEncoding.Scope(RequestEncoding.Kind.USER,Long.toString(staffId)),"VERIFY", "1",UUID.randomUUID().toString());
        byte[] encoded=RequestEncoding.encode(json,namespace.scope(),"VERIFY","1",1,List.of(RequestEncoding.Field.integer("expectedVersion",0)));
        assertThatThrownBy(()->tx.execute(status->{ audit.append(LocalAuditPort.Action.REGISTRATION_VERIFIED,"REGISTRATION","1",staffId,new LocalAuditPort.Snapshot("SUBMITTED","VERIFIED",0L,1L,"SYNTHETIC_MANUAL")); commands.success(namespace,encoded,200,new IdempotencyPort.SafeResult("1","S-DEMO","VERIFIED",1)); throw new IllegalStateException("synthetic rollback"); })).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_events",Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_records",Integer.class)).isZero();
        tx.executeWithoutResult(status->{ commands.success(namespace,encoded,200,new IdempotencyPort.SafeResult("1","S-DEMO","VERIFIED",1)); });
        Long replayVersion=tx.execute(status->commands.replay(namespace,encoded).orElseThrow().result().version());
        assertThat(replayVersion).isEqualTo(1L);
        byte[] changed=RequestEncoding.encode(json,namespace.scope(),"VERIFY","1",1,List.of(RequestEncoding.Field.integer("expectedVersion",1)));
        assertThatThrownBy(()->tx.execute(status->commands.replay(namespace,changed))).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(()->audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"USER","1",staffId,new LocalAuditPort.Snapshot(null,"ACTIVE",null,1L,"LOCAL"))).isInstanceOf(org.springframework.transaction.IllegalTransactionStateException.class);
    }

    /** Both APIs must see one physical connection and one commit, including an explicit JPA flush. */
    @Test void jpaJdbcCommitAndRollbackUseOneConnection() {
        var scope=new RequestEncoding.Scope(RequestEncoding.Kind.USER,Long.toString(staffId));
        var namespace=new IdempotencyPort.Namespace(scope,"VERIFY","50",UUID.randomUUID().toString());
        byte[] encoding=RequestEncoding.encode(json,scope,"VERIFY","50",1,List.of(RequestEncoding.Field.integer("expectedVersion",0)));
        tx.executeWithoutResult(status->{
            accountLoader.lock(staffId);
            assertThat(entities.isJoinedToTransaction()).isTrue();
            Number entityConnection=(Number)entities.createNativeQuery("SELECT CONNECTION_ID()").getSingleResult();
            Long jdbcConnection=jdbc.queryForObject("SELECT CONNECTION_ID()",Long.class);
            assertThat(entityConnection.longValue()).isEqualTo(jdbcConnection);
            assertThat(jdbc.queryForObject("SELECT @@transaction_isolation",String.class)).isEqualTo("READ-COMMITTED");
            entities.persist(new CounterTransactionProbe(50)); entities.flush();
            audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"COUNTER","50",staffId,new LocalAuditPort.Snapshot(null,"ACTIVE",null,0L,"LOCAL"));
            commands.success(namespace,encoding,200,new IdempotencyPort.SafeResult("50","SYNTHETIC_JPA","VERIFIED",0));
        });
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM counters WHERE id=50",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_events",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_records",Integer.class)).isEqualTo(1);
        assertThatThrownBy(()->tx.execute(status->{
            accountLoader.lock(staffId); entities.persist(new CounterTransactionProbe(51)); entities.flush();
            audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"COUNTER","51",staffId,new LocalAuditPort.Snapshot(null,"ACTIVE",null,0L,"LOCAL"));
            throw new IllegalStateException("Synthetic failure after flush");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM counters WHERE id=51",Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_events",Integer.class)).isEqualTo(1);
    }

    /** A real JDBC audit failure rolls back an already-flushed entity and a preceding idempotency insert. */
    @Test void jdbcAuditFailureRollsBackJpaAndIdempotency() {
        var scope=new RequestEncoding.Scope(RequestEncoding.Kind.USER,Long.toString(staffId));
        var namespace=new IdempotencyPort.Namespace(scope,"VERIFY","52",UUID.randomUUID().toString());
        byte[] encoding=RequestEncoding.encode(json,scope,"VERIFY","52",1,List.of(RequestEncoding.Field.integer("expectedVersion",0)));
        jdbc.execute("CREATE TRIGGER synthetic_audit_failure BEFORE INSERT ON audit_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='SYNTHETIC_AUDIT_FAILURE'");
        try {
            assertThatThrownBy(()->tx.execute(status->{
                accountLoader.lock(staffId); entities.persist(new CounterTransactionProbe(52)); entities.flush();
                commands.success(namespace,encoding,200,new IdempotencyPort.SafeResult("52","SYNTHETIC_JPA","VERIFIED",0));
                audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"COUNTER","52",staffId,new LocalAuditPort.Snapshot(null,"ACTIVE",null,0L,"LOCAL"));
                return null;
            })).isInstanceOf(org.springframework.dao.DataAccessException.class);
        } finally { jdbc.execute("DROP TRIGGER synthetic_audit_failure"); }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM counters WHERE id=52",Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_events",Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_records",Integer.class)).isZero();
    }

    /** Bootstrap is only tested against an empty disposable database, never invoked for a real administrator. */
    @Test void bootstrapIsSingleUse() {
        jdbc.update("DELETE FROM user_counter_permissions"); jdbc.update("DELETE FROM users");
        long id=bootstrap.initialize(" SYNTHETIC_ADMIN ",FIXTURE_PASSWORD.toCharArray());
        assertThat(id).isPositive();
        assertThatThrownBy(()->bootstrap.initialize("another_admin",FIXTURE_PASSWORD.toCharArray())).isInstanceOf(ApiFailure.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_events",Integer.class)).isEqualTo(1);
    }

    /** V1 data survives an actual V1 -> V3 upgrade; a repeated migrate is a no-op. */
    @Test void cleanAndUpgradeMigration() throws Exception {
        try(var root=java.sql.DriverManager.getConnection(MYSQL.getJdbcUrl(),"root",MYSQL.getPassword()); var statement=root.createStatement()) {
            statement.execute("CREATE DATABASE migration_probe CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
        }
        String url=MYSQL.getJdbcUrl().replace("/"+MYSQL.getDatabaseName(),"/migration_probe");
        var first=Flyway.configure().dataSource(url,"root",MYSQL.getPassword()).target("1").load();
        assertThat(first.info().applied()).isEmpty(); assertThat(first.migrate().migrationsExecuted).isEqualTo(1);
        try(var connection=java.sql.DriverManager.getConnection(url,"root",MYSQL.getPassword()); var statement=connection.createStatement()) {
            statement.execute("INSERT INTO counters(code,name) VALUES('UPGRADE_FIXTURE','Synthetic upgrade fixture')");
        }
        var latest=Flyway.configure().dataSource(url,"root",MYSQL.getPassword()).load();
        // Upgrade the owned disposable V1 database through V2, V3 and the new QR V4.
        // An existing V1 database upgrades through immutable V2-V4 and the new registration V5.
        assertThat(latest.migrate().migrationsExecuted).isEqualTo(4); latest.validate();
        assertThat(latest.migrate().migrationsExecuted).isZero();
        try(var connection=java.sql.DriverManager.getConnection(url,"root",MYSQL.getPassword()); var statement=connection.createStatement(); var result=statement.executeQuery("SELECT COUNT(*) FROM counters WHERE code='UPGRADE_FIXTURE'")) {
            assertThat(result.next()).isTrue(); assertThat(result.getInt(1)).isEqualTo(1);
        }
    }

    /** Binding creation races roll back the losing insert and retry using the one canonical scope. */
    @Test void concurrentAnonymousBindingHasOneScope() throws Exception {
        var session=sessions.createSession(); sessions.save(session);
        var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<String> create=()->{
                await(start);
                try { return capabilities.bootstrap(session.getId()).scope(); }
                catch(org.springframework.dao.DuplicateKeyException race) { return capabilities.bootstrap(session.getId()).scope(); }
            };
            var first=pool.submit(create); var second=pool.submit(create); start.countDown();
            assertThat(first.get(5,TimeUnit.SECONDS)).isEqualTo(second.get(5,TimeUnit.SECONDS));
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM app_session_bindings",Integer.class)).isEqualTo(1);
        }
    }

    /** A new pending context cannot bypass the activation TTL even if the framework row remains live. */
    @Test void pendingActivationAndSupersededSaveFailClosed() throws Exception {
        Browser browser=new Browser(); browser.login("staff_test"); Session stale=sessions.findById(browser.sessionId());
        String binding=(String)stale.getAttribute(SessionCapabilities.BINDING);
        var pending=capabilities.prepareLogin(binding,staffId,0);
        assertThatThrownBy(()->sessions.save(stale)).isInstanceOf(ApiFailure.class);
        Session updated=sessions.findById(browser.sessionId());
        updated.setAttribute(SessionCapabilities.CONTEXT,pending.id()); updated.setAttribute(SessionCapabilities.GENERATION,pending.generation());
        jdbc.update("UPDATE auth_session_contexts SET activation_expires_at=? WHERE id=?",DatabaseTime.sql(Instant.now().minusSeconds(1)),pending.id());
        assertThatThrownBy(()->sessions.save(updated)).isInstanceOf(ApiFailure.class);
        assertThat(jdbc.queryForObject("SELECT state FROM auth_session_contexts WHERE id=?",String.class,pending.id())).isEqualTo("REVOKED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auth_session_contexts WHERE state='ACTIVE'",Integer.class)).isZero();
    }

    /** Successful framework persistence without successful confirmation never gives an ACTIVE capability. */
    @Test void activationFailureAfterRealSaveDoesNotLogin() throws Exception {
        Browser browser=new Browser(); browser.csrf();
        doAnswer(invocation->{
            if(invocation.getArgument(2)!=null) { throw new DataAccessResourceFailureException("synthetic activation failure"); }
            return invocation.callRealMethod();
        }).when(capabilityHooks).confirmedSave(any(),any(),any(),any(),anyBoolean());
        var response=browser.post("/api/auth/login",Map.of("login","staff_test","password",FIXTURE_PASSWORD),true);
        assertThat(response.statusCode()).isEqualTo(503);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auth_session_contexts WHERE state='ACTIVE'",Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM SPRING_SESSION WHERE PRINCIPAL_NAME='staff_test'",Integer.class)).isEqualTo(1);
        assertThat(response.headers().allValues("Set-Cookie")).isEmpty();
    }

    /** A real MySQL trigger faults the framework UPDATE after prevalidation; confirmed expiry must not move. */
    @Test void actualJdbcSaveFailureDoesNotRenew() throws Exception {
        Browser browser=new Browser(); browser.login("staff_test");
        var before=jdbc.queryForObject("SELECT confirmed_idle_expires_at FROM auth_session_contexts WHERE actor_id=?",java.time.LocalDateTime.class,staffId);
        jdbc.execute("CREATE TRIGGER synthetic_session_save_failure BEFORE UPDATE ON SPRING_SESSION FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='SYNTHETIC_SESSION_SAVE_FAILURE'");
        try {
            var response=browser.get("/api/auth/me"); assertThat(response.statusCode()).isEqualTo(503);
            assertThat(body(response).get("code")).isEqualTo("SERVICE_UNAVAILABLE");
            assertThat(jdbc.queryForObject("SELECT confirmed_idle_expires_at FROM auth_session_contexts WHERE actor_id=?",java.time.LocalDateTime.class,staffId)).isEqualTo(before);
        } finally { jdbc.execute("DROP TRIGGER synthetic_session_save_failure"); }
        assertThat(browser.get("/api/auth/me").statusCode()).isEqualTo(200);
    }

    /** Public entry traffic, including failure responses and CSRF bootstrap, is not staff owner activity. */
    @Test void publicRequestsKeepOwnerDeadlineButStaffRequestRenews() throws Exception {
        Browser browser=new Browser(); browser.login("staff_test"); browser.csrf();
        Session current=sessions.findById(browser.sessionId()); String context=current.getAttribute(SessionCapabilities.CONTEXT);
        jdbc.update("UPDATE auth_session_contexts SET confirmed_idle_expires_at=? WHERE id=?",DatabaseTime.sql(Instant.now().plusSeconds(300)),context);
        var before=ownerDeadline(context); var absolute=jdbc.queryForObject("SELECT absolute_expires_at FROM auth_session_contexts WHERE id=?",java.time.LocalDateTime.class,context);
        String binding=current.getAttribute(SessionCapabilities.BINDING);
        var anonymous=jdbc.queryForObject("SELECT anonymous_expires_at FROM app_session_bindings WHERE id=?",java.time.LocalDateTime.class,binding);
        var probe=new PublicActivityProbe();
        try(var routes=publicProbeRoutes(probe)) {
            for(String path:List.of(PUBLIC_PROBE,PUBLIC_PROBE+"/capabilities",PUBLIC_PROBE+"/schema",PUBLIC_PROBE+"/poll",
                    "/%61pi/public/m00-owner-activity-fixture/registration-entry","/api/public/config/registration","/api/public/csrf")) {
                assertThat(browser.get(path).statusCode()).isEqualTo(200); assertThat(ownerDeadline(context)).isEqualTo(before);
            }
            for(String path:List.of(PUBLIC_PROBE+"/exchange",PUBLIC_PROBE+"/submit")) {
                assertThat(browser.post(path,Map.of(),true).statusCode()).isEqualTo(200); assertThat(ownerDeadline(context)).isEqualTo(before);
            }
            probe.fail=true;
            assertThat(browser.post(PUBLIC_PROBE+"/exchange",Map.of(),true).statusCode()).isEqualTo(409);
            assertThat(ownerDeadline(context)).isEqualTo(before);
            assertThat(jdbc.queryForObject("SELECT absolute_expires_at FROM auth_session_contexts WHERE id=?",java.time.LocalDateTime.class,context)).isEqualTo(absolute);
            assertThat(jdbc.queryForObject("SELECT anonymous_expires_at FROM app_session_bindings WHERE id=?",java.time.LocalDateTime.class,binding)).isEqualTo(anonymous);
            probe.fail=false;
            assertThat(browser.get(STAFF_PROBE).statusCode()).isEqualTo(200);
            assertThat(ownerDeadline(context)).isAfter(before);
        }
    }

    /** Even a successfully persisted owner-bearing PENDING Session cannot be activated by public HTTP. */
    @Test void publicRequestsCannotActivatePendingOwner() throws Exception {
        Browser browser=new Browser(); browser.login("staff_test"); browser.csrf();
        Session current=sessions.findById(browser.sessionId()); String binding=current.getAttribute(SessionCapabilities.BINDING);
        var pending=capabilities.prepareLogin(binding,staffId,0);
        current.setAttribute(SessionCapabilities.CONTEXT,pending.id()); current.setAttribute(SessionCapabilities.GENERATION,pending.generation());
        // No HTTP owner scope exists here: this prepares an actual JDBC fixture, without activating it.
        sessions.save(current); sessions.clearRequest();
        var probe=new PublicActivityProbe();
        try(var routes=publicProbeRoutes(probe)) {
            assertThat(browser.get(PUBLIC_PROBE).statusCode()).isEqualTo(200);
            assertThat(browser.post(PUBLIC_PROBE+"/exchange",Map.of(),true).statusCode()).isEqualTo(200);
            probe.fail=true; assertThat(browser.post(PUBLIC_PROBE+"/exchange",Map.of(),true).statusCode()).isEqualTo(409);
            assertThat(jdbc.queryForObject("SELECT state FROM auth_session_contexts WHERE id=?",String.class,pending.id())).isEqualTo("PENDING");
            assertThat(ownerDeadline(pending.id())).isNull();
            assertThatThrownBy(()->capabilities.requireHuman(binding,pending.id(),pending.generation(),"staff_test")).isInstanceOf(ApiFailure.class);
        }
    }

    /** Public exclusion is not an expiry/revocation bypass: stale authority never becomes usable again. */
    @Test void publicRequestsCannotReviveInvalidOwner() throws Exception {
        try(var routes=publicProbeRoutes(new PublicActivityProbe())) {
            for(String invalid:List.of("confirmed","absolute","anonymous","revoked","epoch","superseded","framework")) {
                Browser browser=new Browser(); browser.login("staff_test");
                Session current=sessions.findById(browser.sessionId()); String context=current.getAttribute(SessionCapabilities.CONTEXT);
                String binding=current.getAttribute(SessionCapabilities.BINDING); Long generation=current.getAttribute(SessionCapabilities.GENERATION);
                String next=null;
                switch(invalid) {
                    case "confirmed" -> jdbc.update("UPDATE auth_session_contexts SET confirmed_idle_expires_at=? WHERE id=?",DatabaseTime.sql(Instant.now().minusSeconds(1)),context);
                    case "absolute" -> jdbc.update("UPDATE auth_session_contexts SET absolute_expires_at=? WHERE id=?",DatabaseTime.sql(Instant.now().minusSeconds(1)),context);
                    case "anonymous" -> jdbc.update("UPDATE app_session_bindings SET anonymous_expires_at=? WHERE id=?",DatabaseTime.sql(Instant.now().minusSeconds(1)),binding);
                    case "revoked" -> jdbc.update("UPDATE auth_session_contexts SET state='REVOKED',revoked_at=? WHERE id=?",DatabaseTime.sql(Instant.now()),context);
                    case "epoch" -> jdbc.update("UPDATE users SET security_epoch=security_epoch+1 WHERE id=?",staffId);
                    case "superseded" -> next=capabilities.prepareLogin(binding,staffId,accountLoader.find("staff_test").epoch()).id();
                    case "framework" -> jdbc.update("UPDATE SPRING_SESSION SET EXPIRY_TIME=? WHERE SESSION_ID=?",Instant.now().minusSeconds(1).toEpochMilli(),browser.sessionId());
                    default -> throw new IllegalStateException("Unknown synthetic invalidity");
                }
                var before=ownerDeadline(context);
                var response=browser.get(PUBLIC_PROBE);
                // The fixture still carries the old Session; persisted-expiry denial must reach the safe tail boundary.
                assertThat(response.statusCode()).isEqualTo(503);
                assertThat(ownerDeadline(context)).isEqualTo(before);
                assertThatThrownBy(()->capabilities.requireHuman(binding,context,generation,"staff_test")).isInstanceOf(ApiFailure.class);
                if(next!=null) { assertThat(jdbc.queryForObject("SELECT state FROM auth_session_contexts WHERE id=?",String.class,next)).isEqualTo("PENDING"); }
            }
        }
    }

    /** A deadline crossing after the real framework save is rejected by confirmation, without resurrection. */
    @Test void latePublicConfirmationCannotRenewOwner() throws Exception {
        Browser browser=new Browser(); browser.login("staff_test");
        Session current=sessions.findById(browser.sessionId()); String context=current.getAttribute(SessionCapabilities.CONTEXT);
        var expired=DatabaseTime.sql(Instant.now().minusSeconds(1));
        doAnswer(invocation->{
            if(context.equals(invocation.getArgument(2)) && !((Boolean)invocation.getArgument(4))) {
                jdbc.update("UPDATE auth_session_contexts SET confirmed_idle_expires_at=? WHERE id=?",expired,context);
            }
            return invocation.callRealMethod();
        }).when(capabilityHooks).confirmedSave(any(),any(),any(),any(),anyBoolean());
        try(var routes=publicProbeRoutes(new PublicActivityProbe())) {
            var response=browser.get(PUBLIC_PROBE); assertThat(response.statusCode()).isEqualTo(503);
            assertThat(body(response).get("code")).isEqualTo("SERVICE_UNAVAILABLE");
            assertThat(ownerDeadline(context)).isEqualTo(expired);
            assertThat(browser.get("/api/auth/me").statusCode()).isEqualTo(401);
            assertThat(jdbc.queryForObject("SELECT state FROM auth_session_contexts WHERE id=?",String.class,context)).isEqualTo("REVOKED");
        }
    }

    /** Public success followed by a real Session UPDATE fault remains an unknown response, not success. */
    @Test void publicFrameworkFailureStillReturnsUnknown() throws Exception {
        Browser browser=new Browser(); browser.login("staff_test"); browser.csrf();
        Session current=sessions.findById(browser.sessionId()); String context=current.getAttribute(SessionCapabilities.CONTEXT);
        var before=ownerDeadline(context);
        try(var routes=publicProbeRoutes(new PublicActivityProbe())) {
            jdbc.execute("CREATE TRIGGER synthetic_public_save_failure BEFORE UPDATE ON SPRING_SESSION FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='SYNTHETIC_PUBLIC_SAVE_FAILURE'");
            try {
                var response=browser.post(PUBLIC_PROBE+"/exchange",Map.of(),true);
                assertThat(response.statusCode()).isEqualTo(503); assertThat(body(response).get("code")).isEqualTo("SERVICE_UNAVAILABLE");
                assertThat(response.body()).contains("original command key").doesNotContain("SYNTHETIC_SUCCESS","SQLException");
                assertThat(response.headers().allValues("Set-Cookie")).isEmpty(); assertThat(ownerDeadline(context)).isEqualTo(before);
            } finally { jdbc.execute("DROP TRIGGER synthetic_public_save_failure"); }
            assertThat(browser.post(PUBLIC_PROBE+"/exchange",Map.of(),true).statusCode()).isEqualTo(200);
            assertThat(ownerDeadline(context)).isEqualTo(before);
        }
    }

    /** Password verification at an old epoch cannot activate a new role granted concurrently. */
    @Test void policyEditDuringPasswordVerificationRejectsLogin() throws Exception {
        Browser admin=new Browser(); admin.login("admin_test"); var proof=proof(admin,"admin_test");
        Browser staff=new Browser(); staff.csrf(); var loaded=new CountDownLatch(1); var release=new CountDownLatch(1);
        doAnswer(invocation->{ var principal=invocation.callRealMethod(); loaded.countDown(); await(release); return principal; })
                .when(accountLoader).loadUserByUsername("staff_test");
        try(var pool=Executors.newSingleThreadExecutor()) {
            var signingIn=pool.submit(()->staff.post("/api/auth/login",Map.of("login","staff_test","password",FIXTURE_PASSWORD),true));
            assertThat(loaded.await(5,TimeUnit.SECONDS)).isTrue();
            changes.update(proof,staffId,0,"ADMIN",true); release.countDown();
            assertThat(signingIn.get(5,TimeUnit.SECONDS).statusCode()).isEqualTo(401);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM auth_session_contexts WHERE actor_id=? AND state='ACTIVE'",Integer.class,staffId)).isZero();
        } finally { release.countDown(); }
    }

    /** Expired scope recovery creates a fresh identity and fresh CSRF, without restoring old grants. */
    @Test void expiredSessionCanBootstrapAgain() throws Exception {
        Browser browser=new Browser(); browser.login("staff_test");
        String oldScope=jdbc.queryForObject("SELECT anonymous_scope_id FROM app_session_bindings",String.class);
        jdbc.update("UPDATE auth_session_contexts SET absolute_expires_at=? WHERE actor_id=?",DatabaseTime.sql(Instant.now().minusSeconds(1)),staffId);
        assertThat(browser.get("/api/auth/me").statusCode()).isEqualTo(401);
        browser.csrf();
        String newScope=jdbc.queryForObject("SELECT anonymous_scope_id FROM app_session_bindings WHERE invalidated_at IS NULL",String.class);
        assertThat(newScope.equals(oldScope)).isFalse();
        assertThat(browser.post("/api/auth/login",Map.of("login","staff_test","password",FIXTURE_PASSWORD),true).statusCode()).isEqualTo(200);
    }

    /** A fresh instance under a context path reads persisted identity and enforces the same current-owner guard. */
    @Test void secondApplicationReadsPersistedSession() throws Exception {
        Browser browser=new Browser(); browser.login("admin_test");
        String oldSession=browser.sessionId();
        Session persisted=sessions.findById(oldSession); String context=persisted.getAttribute(SessionCapabilities.CONTEXT);
        jdbc.update("UPDATE auth_session_contexts SET confirmed_idle_expires_at=? WHERE id=?",DatabaseTime.sql(Instant.now().plusSeconds(300)),context);
        var before=ownerDeadline(context);
        try(var second=startApplication(WebApplicationType.SERVLET,false)) {
            int secondPort=Integer.parseInt(second.getEnvironment().getProperty("local.server.port"));
            var bootstrapResponse=browser.client.send(HttpRequest.newBuilder(URI.create("http://localhost:"+secondPort+"/foundation/api/public/csrf")).GET().build(),HttpResponse.BodyHandlers.ofString());
            assertThat(bootstrapResponse.statusCode()).isEqualTo(200); assertThat(ownerDeadline(context)).isEqualTo(before);
            var response=browser.client.send(HttpRequest.newBuilder(URI.create("http://localhost:"+secondPort+"/foundation/api/auth/me")).GET().build(),HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).isEqualTo(200); assertThat(body(response).get("id")).isEqualTo(Long.toString(adminId));
            assertThat(ownerDeadline(context)).isAfter(before);
            assertThat(browser.sessionId().equals(oldSession)).isTrue();
            jdbc.update("UPDATE users SET security_epoch=security_epoch+1 WHERE id=?",adminId);
            var denied=browser.client.send(HttpRequest.newBuilder(URI.create("http://localhost:"+secondPort+"/foundation/api/admin/integrations")).GET().build(),HttpResponse.BodyHandlers.ofString());
            assertThat(denied.statusCode()).isEqualTo(401);
        }
        assertThat(browser.get("/api/auth/me").statusCode()).isEqualTo(401);
    }

    /** Offline initialization without a console fails before reading credentials or creating an administrator. */
    @Test void offlineBootstrapWithoutConsoleFailsClosed() {
        assertThatThrownBy(()->{ try(var ignored=startApplication(WebApplicationType.NONE,true)) { } })
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("Bootstrap requires an offline interactive console");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users",Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT completed FROM bootstrap_state WHERE id=1",Boolean.class)).isFalse();
    }

    /** Two concurrent bootstraps can create only one account and one audit event. */
    @Test void bootstrapCompetitionCreatesOneAdministrator() throws Exception {
        jdbc.update("DELETE FROM user_counter_permissions"); jdbc.update("DELETE FROM users");
        var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Boolean> create=()->{ await(start); try { bootstrap.initialize("fixture_admin",FIXTURE_PASSWORD.toCharArray()); return true; } catch(ApiFailure closed) { return false; } };
            var first=pool.submit(create); var second=pool.submit(create); start.countDown();
            assertThat(List.of(first.get(5,TimeUnit.SECONDS),second.get(5,TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM users",Integer.class)).isEqualTo(1);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_events",Integer.class)).isEqualTo(1);
        }
    }

    /** Same-key callers recheck after domain locks, before stale expectedVersion validation. */
    @Test void idempotentConcurrencyWritesOneAuditAndVersion() throws Exception {
        Browser browser=new Browser(); browser.login("staff_test");
        String context=jdbc.queryForObject("SELECT id FROM auth_session_contexts WHERE actor_id=?",String.class,staffId);
        var namespace=new IdempotencyPort.Namespace(new RequestEncoding.Scope(RequestEncoding.Kind.USER,Long.toString(staffId)),"VERIFY","1",UUID.randomUUID().toString());
        byte[] encoded=RequestEncoding.encode(json,namespace.scope(),"VERIFY","1",1,List.of(RequestEncoding.Field.integer("expectedVersion",0)));
        var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Long> command=()->{ await(start); return tx.execute(status->{
                capabilities.lockOwners(List.of(new SessionCapabilities.OwnerUse(context,1)),null);
                var previous=commands.replay(namespace,encoded); if(previous.isPresent()) { return previous.get().result().version(); }
                long version=jdbc.queryForObject("SELECT version FROM counters WHERE id=1",Long.class);
                if(version!=0) { throw new ApiFailure(409,"VERSION_CONFLICT","Synthetic probe version conflict."); }
                jdbc.update("UPDATE counters SET version=version+1 WHERE id=1");
                audit.append(LocalAuditPort.Action.ADMIN_CHANGED,"COUNTER","1",staffId,new LocalAuditPort.Snapshot("ACTIVE","ACTIVE",0L,1L,"LOCAL"));
                commands.success(namespace,encoded,200,new IdempotencyPort.SafeResult("1","SYNTHETIC_PROBE","VERIFIED",1)); return 1L;
            }); };
            var first=pool.submit(command); var second=pool.submit(command); start.countDown();
            assertThat(first.get(5,TimeUnit.SECONDS)).isEqualTo(1L); assertThat(second.get(5,TimeUnit.SECONDS)).isEqualTo(1L);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_events",Integer.class)).isEqualTo(1);
            assertThat(jdbc.queryForObject("SELECT version FROM counters WHERE id=1",Long.class)).isEqualTo(1L);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_records",Integer.class)).isEqualTo(1);
        }
    }

    /** MySQL itself rejects malformed/duplicate canonical identities, including the regex newline edge. */
    @Test void mysqlAccountConstraints() {
        String hash=passwords.encode(FIXTURE_PASSWORD);
        for(String invalid:List.of("ADMIN_TEST","staff_test\n","a@b","xy","staff_test")) {
            assertThatThrownBy(()->jdbc.update("INSERT INTO users(login,password_hash,role,created_at,updated_at) VALUES(?,?,'ADMIN',?,?)",invalid,hash,DatabaseTime.sql(Instant.now()),DatabaseTime.sql(Instant.now())))
                    .isInstanceOf(org.springframework.dao.DataAccessException.class).satisfies(failure->{
                        var sql=((org.springframework.dao.DataAccessException)failure).getMostSpecificCause();
                        assertThat(sql).isInstanceOf(java.sql.SQLException.class);
                        assertThat(((java.sql.SQLException)sql).getErrorCode()).isIn(3819,1062);
                    });
        }
    }

    /** Database loss is exercised by pausing only this disposable container and always unpausing it. */
    @Test @Order(999) void databaseOfflineReadinessAndRecovery() throws Exception {
        MYSQL.getDockerClient().pauseContainerCmd(MYSQL.getContainerId()).exec();
        try {
            // Allow the bounded pool-validation and SQL timeouts to complete under concurrent Docker test load.
            var request=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/health")).timeout(java.time.Duration.ofSeconds(30)).GET().build();
            var response=HttpClient.newHttpClient().send(request,HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).isEqualTo(503); assertThat(body(response).get("code")).isEqualTo("SERVICE_UNAVAILABLE");
            assertThat(response.body()).doesNotContain("jdbc:","SQLException","stackTrace");
        } finally { MYSQL.getDockerClient().unpauseContainerCmd(MYSQL.getContainerId()).exec(); }
        assertThat(new Browser().get("/api/health").statusCode()).isEqualTo(200);
    }

    /** Secondary contexts receive only the disposable container configuration, never local .env imports. */
    private org.springframework.context.ConfigurableApplicationContext startApplication(WebApplicationType web,boolean bootstrapEnabled) {
        var environment=new StandardEnvironment(); var settings=new java.util.HashMap<String,Object>();
        settings.put("spring.datasource.url",MYSQL.getJdbcUrl()); settings.put("spring.datasource.username",MYSQL.getUsername()); settings.put("spring.datasource.password",MYSQL.getPassword());
        settings.put("spring.config.import",""); settings.put("server.port","0"); settings.put("hsaas.environment","test"); settings.put("hsaas.secure-cookie","false");
        settings.put("hsaas.bootstrap.enabled",Boolean.toString(bootstrapEnabled)); settings.put("logging.level.root","WARN");
        if(web==WebApplicationType.SERVLET) { settings.put("server.servlet.context-path","/foundation"); }
        environment.getPropertySources().addFirst(new MapPropertySource("isolated-container",settings));
        return new SpringApplicationBuilder(HsaasBackendApplication.class).environment(environment).profiles("test").web(web).logStartupInfo(false).run();
    }

    private static final String PUBLIC_PROBE="/api/public/m00-owner-activity-fixture/registration-entry";
    private static final String STAFF_PROBE="/api/staff/m00-owner-activity-fixture";

    /** Uses real servlet/filter dispatch without creating or shadowing any production entry/registration endpoint. */
    private AutoCloseable publicProbeRoutes(PublicActivityProbe probe) throws NoSuchMethodException {
        var get=org.springframework.web.servlet.mvc.method.RequestMappingInfo.paths(PUBLIC_PROBE,PUBLIC_PROBE+"/capabilities",
                PUBLIC_PROBE+"/schema",PUBLIC_PROBE+"/poll",STAFF_PROBE)
                .methods(org.springframework.web.bind.annotation.RequestMethod.GET).options(mappings.getBuilderConfiguration()).build();
        var post=org.springframework.web.servlet.mvc.method.RequestMappingInfo.paths(PUBLIC_PROBE+"/exchange",PUBLIC_PROBE+"/submit")
                .methods(org.springframework.web.bind.annotation.RequestMethod.POST).options(mappings.getBuilderConfiguration()).build();
        var method=PublicActivityProbe.class.getMethod("visit",jakarta.servlet.http.HttpServletRequest.class);
        mappings.registerMapping(get,probe,method); mappings.registerMapping(post,probe,method);
        return ()->{ mappings.unregisterMapping(get); mappings.unregisterMapping(post); };
    }

    /** Response-body fixture is registered only for each test; it is neither scanned nor packaged as a controller. */
    @org.springframework.web.bind.annotation.ResponseBody
    static final class PublicActivityProbe {
        private volatile boolean fail;
        /** Touches the actual HttpSession so the real request-end JDBC save runs on success and failure. */
        public Map<String,String> visit(jakarta.servlet.http.HttpServletRequest request) {
            request.getSession().setAttribute("M00_SYNTHETIC_PUBLIC_ACTIVITY","VISIT");
            if(fail) { throw new ApiFailure(409,"VERSION_CONFLICT","Synthetic public request conflict."); }
            return Map.of("status","SYNTHETIC_SUCCESS");
        }
    }

    /** Reads the authoritative guard deadline directly from disposable MySQL, preserving its microseconds. */
    private java.time.LocalDateTime ownerDeadline(String context) {
        return jdbc.queryForObject("SELECT confirmed_idle_expires_at FROM auth_session_contexts WHERE id=?",java.time.LocalDateTime.class,context);
    }

    /** Keeps test coordination bounded so a deadlock fails rather than hanging verification. */
    private static void await(CountDownLatch latch) { try { if(!latch.await(5,TimeUnit.SECONDS)) { throw new IllegalStateException("Test latch timeout"); } } catch(InterruptedException failure) { Thread.currentThread().interrupt(); throw new IllegalStateException("Interrupted test"); } }
    /** Session proof comes from persisted test state, never from a submitted public DTO. */
    private AccountChanges.Proof proof(Browser browser,String login) {
        var rows=jdbc.queryForMap("SELECT B.id,C.id AS context_id,C.generation FROM app_session_bindings B JOIN auth_session_contexts C ON C.id=B.current_owner_context_id JOIN SPRING_SESSION S ON S.PRIMARY_ID=B.spring_primary_id WHERE S.SESSION_ID=?",browser.sessionId());
        return new AccountChanges.Proof((String)rows.get("id"),(String)rows.get("context_id"),((Number)rows.get("generation")).longValue(),login);
    }
    @SuppressWarnings("unchecked") private Map<String,Object> body(HttpResponse<String> response) { return json.readValue(response.body(),Map.class); }
    /** Real HTTP cookie/CSRF helper; no cookie or token value is printed in evidence. */
    private class Browser {
        final CookieManager cookies=new CookieManager(null,CookiePolicy.ACCEPT_ALL);
        final HttpClient client=HttpClient.newBuilder().cookieHandler(cookies).build();
        String token;
        HttpResponse<String> get(String path) throws Exception { return client.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+path)).GET().build(),HttpResponse.BodyHandlers.ofString()); }
        HttpResponse<String> post(String path,Object value,boolean csrf) throws Exception { return raw(path,json.writeValueAsString(value),csrf); }
        HttpResponse<String> raw(String path,String value,boolean csrf) throws Exception {
            var request=HttpRequest.newBuilder(URI.create("http://localhost:"+port+path)).header("Content-Type","application/json");
            if(csrf && token!=null) { request.header("X-CSRF-TOKEN",token); }
            return client.send(request.POST(HttpRequest.BodyPublishers.ofString(value)).build(),HttpResponse.BodyHandlers.ofString());
        }
        void csrf() throws Exception { var response=get("/api/public/csrf"); assertThat(response.statusCode()).isEqualTo(200); token=(String)body(response).get("token"); }
        void login(String name) throws Exception { csrf(); assertThat(post("/api/auth/login",Map.of("login",name,"password",FIXTURE_PASSWORD),true).statusCode()).isEqualTo(200); }
        String sessionId() { var cookie=cookies.getCookieStore().getCookies().stream().filter(value->value.getName().equals("HSAAS_SESSION")).findFirst().orElseThrow(); return new String(Base64.getDecoder().decode(cookie.getValue()),StandardCharsets.UTF_8); }
    }
}
