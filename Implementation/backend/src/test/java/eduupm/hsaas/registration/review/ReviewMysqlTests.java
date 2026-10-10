package eduupm.hsaas.registration.review;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
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
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.auth.LoginLimiter;
import eduupm.hsaas.auth.AccountChanges;
import eduupm.hsaas.auth.Accounts;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.IdempotencyPort;
import eduupm.hsaas.common.LocalAuditPort;
import eduupm.hsaas.registration.RegistrationReviewPort;
import eduupm.hsaas.registration.RegistrationReadPort;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Candidate real servlet/MySQL acceptance: roots are created by public QR/grant/submission HTTP, never private M03 fixtures. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class ReviewMysqlTests {
    @Container static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0.45")
            .withCommand("--log-bin-trust-function-creators=1");
    @LocalServerPort int port;
    @MockitoSpyBean JdbcTemplate jdbc;
    @Autowired JsonMapper json;
    @Autowired PasswordEncoder passwords;
    @Autowired LoginLimiter loginLimiter;
    @Autowired RegistrationReadPort reads;
    @Autowired TransactionTemplate transaction;
    @Autowired AccountChanges changes;
    @MockitoSpyBean Accounts accounts;
    @MockitoSpyBean SessionCapabilities capabilities;
    @MockitoSpyBean Clock clock;
    @MockitoSpyBean RegistrationReviewPort root;
    @MockitoSpyBean IdempotencyPort idempotency;
    @MockitoSpyBean LocalAuditPort audit;
    private Instant now;
    private static final String PASSWORD = "Public-synthetic-review_1";
    private static final List<String> CATEGORIES = List.of("EXECUTIVE", "PENJAGA", "VENDOR", "CONTRACTOR");
    private static final String RAW_NAME = "Synthetic Privacy Marker";
    private static final String RAW_ID = "DEMO-PRIVACY001";
    private static final String RAW_PHONE = "+60123456789";
    private static final String RAW_MRN = "DEMO-MRN-MATCH";

    /** Explicit disposable connection and disabled integrations prevent native DB or production-policy fallback. */
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", MYSQL::getJdbcUrl); properties.add("spring.datasource.username", MYSQL::getUsername);
        properties.add("spring.datasource.password", MYSQL::getPassword);
        properties.add("hsaas.environment", () -> "test"); properties.add("hsaas.secure-cookie", () -> "false");
        properties.add("hsaas.bootstrap.enabled", () -> "false"); properties.add("hsaas.reader-mode", () -> "disabled");
        properties.add("hsaas.mrn-mode", () -> "mock"); properties.add("hsaas.notification-mode", () -> "disabled");
        properties.add("hsaas.blockchain-mode", () -> "disabled");
        properties.add("hsaas.qr.enabled", () -> "true"); properties.add("hsaas.qr.origin", () -> "https://review.example.test");
        properties.add("hsaas.registration.enabled", () -> "true"); properties.add("hsaas.review.enabled", () -> "true");
        properties.add("hsaas.qr.active-key", () -> "fixture");
        properties.add("hsaas.qr.keys.fixture", () -> Base64.getEncoder().encodeToString(new byte[32]));
        properties.add("hsaas.hash-key-version", () -> "fixture");
        properties.add("hsaas.hash-key", () -> Base64.getEncoder().encodeToString(new byte[32]));
        properties.add("logging.level.root", () -> "WARN");
    }

    /** Only this container is cleared; break the reviewed grant/root cycle before deleting roots, with no FK-check bypass. */
    @BeforeEach void fixtures() {
        reset(clock); now = Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS); doReturn(now).when(clock).instant();
        // Reset only this test context's stable M00 limiter fixture, preserving real throttling within each scenario.
        ((Map<?, ?>) org.springframework.test.util.ReflectionTestUtils.getField(loginLimiter, "buckets")).clear();
        jdbc.execute("DROP TRIGGER IF EXISTS m04_audit_failure"); jdbc.execute("DROP TRIGGER IF EXISTS m04_unique_failure");
        jdbc.execute("DROP TRIGGER IF EXISTS m04_winner_failure");
        // V4 consumption pairs must be cleared together while breaking V5's disposable circular parent pointer.
        jdbc.update("UPDATE registration_entry_grants SET consumed_at=NULL,registration_id=NULL,replaces_grant_id=NULL,replaces_binding_version=NULL");
        for (String table : List.of("mrn_validation_records", "registration_consents", "visitor_registrations", "registration_entry_contexts",
                "registration_entry_grants", "registration_qr_challenges", "registration_qr_sessions", "audit_events", "idempotency_records")) {
            jdbc.update("DELETE FROM " + table);
        }
        jdbc.update("UPDATE app_session_bindings SET current_owner_context_id=NULL");
        for (String table : List.of("auth_session_contexts", "app_session_bindings", "SPRING_SESSION_ATTRIBUTES", "SPRING_SESSION",
                "user_counter_permissions", "users", "counters", "visitor_categories", "destinations")) jdbc.update("DELETE FROM " + table);
        String password = passwords.encode(PASSWORD);
        for (String login : List.of("review_a", "review_b", "review_hidden", "review_admin")) {
            jdbc.update("INSERT INTO users(login,password_hash,role,created_at,updated_at) VALUES(?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))",
                    login, password, login.equals("review_admin") ? "ADMIN" : "COUNTER_STAFF");
        }
        jdbc.update("INSERT INTO counters(id,code,name) VALUES(1,'M04_ONE','Review test one'),(2,'M04_TWO','Review test two')");
        jdbc.update("INSERT INTO destinations(id,code,name) VALUES(1,'M04_WARD','Synthetic Ward'),(2,'M04_OFFICE','Synthetic Office')");
        for (int index = 0; index < CATEGORIES.size(); index++) {
            jdbc.update("INSERT INTO visitor_categories(id,code,name) VALUES(?,?,?)", index + 1, CATEGORIES.get(index), "Synthetic " + CATEGORIES.get(index));
        }
        jdbc.update("INSERT INTO user_counter_permissions(user_id,counter_id) SELECT id,IF(login='review_hidden',2,1) FROM users WHERE role='COUNTER_STAFF'");
        clearInvocations(root, idempotency, audit);
    }

    /** Four public submissions produce exact scoped masks, descending tie order, stable pages and nullable non-Penjaga fields. */
    @Test void fourCategoryRegistrationToMaskedQueueAndDetail() throws Exception {
        Browser staff = staff("review_a"); List<Registration> registrations = new ArrayList<>();
        for (String category : CATEGORIES) registrations.add(register(staff, "1", category, false));
        var response = staff.get("/api/staff/registrations?counterId=1&pageSize=2"); status(response, 200); privateResponse(response);
        var page = tree(response); assertThat(page.path("total").asLong()).isEqualTo(4); assertThat(page.path("pageSize").asInt()).isEqualTo(2);
        assertThat(page.path("items").get(0).path("id").asString()).isEqualTo(registrations.get(3).id());
        var next = tree(staff.get("/api/staff/registrations?counterId=1&page=1&pageSize=2"));
        assertThat(next.path("items").get(0).path("id").asString()).isEqualTo(registrations.get(1).id());
        var filtered = tree(staff.get("/api/staff/registrations?counterId=1&category=PENJAGA&status=SUBMITTED"));
        assertThat(filtered.path("total").asLong()).isEqualTo(1);
        for (var registration : registrations) {
            var detail = staff.get("/api/staff/registrations/" + registration.id()); status(detail, 200); privateResponse(detail);
            assertThat(tree(detail).path("source").asString()).isEqualTo("SYNTHETIC");
            assertThat(tree(detail).path("review").isNull()).isTrue();
            if (!registration.category().equals("PENJAGA")) assertThat(tree(detail).path("maskedMrn").isNull()).isTrue();
        }
    }

    /** Duplicate keys, unknown selectors, blank values and offset overflow are real servlet 400s, never broadened reads. */
    @Test void invalidGetQueriesAreRejectedOverActualHttp() throws Exception {
        Browser staff = staff("review_a");
        for (String query : List.of("counterId=1&counterId=1", "counterId=1&actorId=9", "counterId=1&category=ALL", "counterId=1&status=",
                "counterId=1&page=-1", "counterId=1&page=9007199254740992", "counterId=1&page=2147483647&pageSize=50", "counterId=1&pageSize=51")) {
            status(staff.get("/api/staff/registrations?" + query), 400);
        }
    }

    /** Public references and current cached counter UI confer no staff capability; ADMIN is not Counter Staff. */
    @Test void anonymousAdminAndInvisibleCounterHaveSafeBoundaries() throws Exception {
        Browser one = staff("review_a"), hidden = staff("review_hidden"); var inaccessible = register(hidden, "2", "VENDOR", false);
        status(new Browser().get("/api/staff/registrations?counterId=1"), 401);
        status(staff("review_admin").get("/api/staff/registrations?counterId=1"), 403);
        var wrongCounter = one.get("/api/staff/registrations/" + inaccessible.id()); status(wrongCounter, 404);
        var missing = one.get("/api/staff/registrations/9223372036854775807"); status(missing, 404);
        assertThat(tree(wrongCounter).path("code").asString()).isEqualTo("NOT_FOUND");
        assertThat(tree(wrongCounter).path("message").asString()).isEqualTo(tree(missing).path("message").asString());
        status(one.get("/api/staff/registrations?counterId=2"), 404);
    }

    /** Real CSRF and strict raw JSON parsing precede mutation; no root/evidence/audit/result can survive invalid commands. */
    @Test void csrfUnknownDuplicateTrailingAndUnsafeVersionCannotReview() throws Exception {
        Browser staff = staff("review_a"); var registration = register(staff, "1", "VENDOR", false); String key = key();
        status(staff.post(path(registration, "verify"), verify(registration.category()), key, false), 403);
        for (String body : List.of("{\"expectedVersion\":0,\"identityConfirmed\":true,\"actorId\":9}",
                "{\"expectedVersion\":0,\"expectedVersion\":0}", "{} {}", "{\"expectedVersion\":9007199254740992}")) {
            status(staff.raw(path(registration, "verify"), body, key, true), 400);
        }
        unchanged(registration); assertThat(reviewAudits(registration)).isZero(); assertThat(reviewResults(registration)).isZero();
    }

    /** Mock MATCH remains feedback only; the persisted synthetic staff checks must be complete and server attributed. */
    @Test void penjagaMatchRequiresAllHumanSimulationChecks() throws Exception {
        Browser staff = staff("review_a"); var registration = register(staff, "1", "PENJAGA", true);
        assertThat(tree(staff.get("/api/staff/registrations/" + registration.id())).path("mrnFeedback").asString()).isEqualTo("MATCH");
        status(staff.post(path(registration, "verify"), Map.of("expectedVersion", 0, "identityConfirmed", true), key(), true), 400);
        unchanged(registration);
        status(staff.post(path(registration, "verify"), verify("PENJAGA"), key(), true), 200);
        var detail = tree(staff.get("/api/staff/registrations/" + registration.id()));
        assertThat(detail.path("review").path("actorId").asString()).isEqualTo(Long.toString(actor("review_a")));
        assertThat(detail.path("review").path("source").asString()).isEqualTo("SYNTHETIC_MANUAL");
        assertThat(detail.path("review").path("basisCodes").size()).isEqualTo(3); assertThat(reviewAudits(registration)).isEqualTo(1);
    }

    /** Controlled timeout/unavailable/no-match feedback preserves a submitted root pending explicit human simulation. */
    @Test void adverseMockFeedbackDoesNotDiscardOrAutomaticallyVerifyRegistration() throws Exception {
        Browser staff = staff("review_a");
        for (String mrn : List.of("DEMO-MRN-TIMEOUT", "DEMO-MRN-UNAVAILABLE", "DEMO-MRN-NOMATCH")) {
            var registration = register(staff, "1", "PENJAGA", mrn);
            unchanged(registration); assertThat(reviewAudits(registration)).isZero();
            status(staff.post(path(registration, "verify"), Map.of("expectedVersion", 0, "identityConfirmed", true), key(), true), 400);
            status(staff.post(path(registration, "verify"), verify("PENJAGA"), key(), true), 200);
        }
    }

    /** Approval commits one root/version/audit/result and never creates a pass, assignment or external job table. */
    @Test void successfulReviewPersistsOnceAndDoesNotAssignAnything() throws Exception {
        Browser staff = staff("review_a"); var registration = register(staff, "1", "EXECUTIVE", false);
        var result = staff.post(path(registration, "verify"), verify("EXECUTIVE"), key(), true); status(result, 200);
        assertThat(tree(result).path("reference").asString()).isEqualTo(registration.reference());
        assertThat(tree(result).path("version").asLong()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT status FROM visitor_registrations WHERE id=?", String.class, registration.id())).isEqualTo("VERIFIED");
        assertThat(reviewAudits(registration)).isEqualTo(1); assertThat(reviewResults(registration)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('assignments','notification_jobs','audit_outbox')", Integer.class)).isZero();
    }

    /** The same original key/version/evidence replays; a changed body cannot reuse the successful namespace. */
    @Test void replayAndChangedBodyHavePersistedSingleOutcome() throws Exception {
        Browser staff = staff("review_a"); var registration = register(staff, "1", "VENDOR", false); String key = key();
        var first = staff.post(path(registration, "verify"), verify("VENDOR"), key, true); status(first, 200);
        var replay = staff.post(path(registration, "verify"), verify("VENDOR"), key, true); status(replay, 200);
        assertThat(tree(replay)).isEqualTo(tree(first));
        var changed = new HashMap<String, Object>(verify("VENDOR")); changed.put("expectedVersion", 1);
        status(staff.post(path(registration, "verify"), changed, key, true), 409);
        assertThat(reviewAudits(registration)).isEqualTo(1); assertThat(reviewResults(registration)).isEqualTo(1);
    }

    /** Rejection needs a category-valid safe reason, persists local metadata and is replayable without a second audit. */
    @Test void rejectionRequiresReasonAndPersistsOnlySafeLocalMetadata() throws Exception {
        Browser staff = staff("review_a"); var registration = register(staff, "1", "CONTRACTOR", false); String key = key();
        status(staff.post(path(registration, "reject"), Map.of("expectedVersion", 0), key, true), 400);
        status(staff.post(path(registration, "reject"), Map.of("expectedVersion", 0, "reasonCode", "MRN_WARD_NOT_CONFIRMED"), key, true), 400);
        var body = Map.of("expectedVersion", 0, "reasonCode", "INFORMATION_INCOMPLETE");
        status(staff.post(path(registration, "reject"), body, key, true), 200);
        status(staff.post(path(registration, "reject"), body, key, true), 200);
        var detail = tree(staff.get("/api/staff/registrations/" + registration.id()));
        assertThat(detail.path("review").path("source").asString()).isEqualTo("LOCAL");
        assertThat(detail.path("review").path("reasonCode").asString()).isEqualTo("INFORMATION_INCOMPLETE");
        assertThat(reviewAudits(registration)).isEqualTo(1); assertThat(reviewResults(registration)).isEqualTo(1);
    }

    /** Out-of-band fixture permission removal leaves the cached session epoch intact so current counter 404 is tested directly. */
    @Test void permissionRemovalBlocksReadsAndSuccessfulReplay() throws Exception {
        Browser staff = staff("review_a"); var registration = register(staff, "1", "VENDOR", false); String key = key();
        status(staff.post(path(registration, "verify"), verify("VENDOR"), key, true), 200);
        jdbc.update("UPDATE user_counter_permissions SET active=FALSE WHERE user_id=? AND counter_id=1", actor("review_a"));
        status(staff.get("/api/staff/registrations?counterId=1"), 404); status(staff.get("/api/staff/registrations/" + registration.id()), 404);
        status(staff.post(path(registration, "verify"), verify("VENDOR"), key, true), 404); assertThat(reviewAudits(registration)).isEqualTo(1);
    }

    /** Counter closure is checked even for a retained successful command; current root masks cannot be read afterward. */
    @Test void inactiveCounterBlocksSuccessfulReplay() throws Exception {
        Browser staff = staff("review_a"); var registration = register(staff, "1", "VENDOR", false); String key = key();
        status(staff.post(path(registration, "verify"), verify("VENDOR"), key, true), 200);
        jdbc.update("UPDATE counters SET active=FALSE WHERE id=1");
        status(staff.post(path(registration, "verify"), verify("VENDOR"), key, true), 404);
        status(staff.get("/api/staff/registrations/" + registration.id()), 404); assertThat(reviewResults(registration)).isEqualTo(1);
    }

    /** A current role change without epoch invalidation deliberately isolates the service's 403 role boundary from session 401. */
    @Test void currentRoleChangeBlocksRetainedSuccess() throws Exception {
        Browser staff = staff("review_a"); var registration = register(staff, "1", "VENDOR", false); String key = key();
        status(staff.post(path(registration, "verify"), verify("VENDOR"), key, true), 200);
        jdbc.update("UPDATE users SET role='ADMIN' WHERE id=?", actor("review_a"));
        status(staff.post(path(registration, "verify"), verify("VENDOR"), key, true), 403);
        status(staff.get("/api/staff/registrations?counterId=1"), 403); assertThat(reviewAudits(registration)).isEqualTo(1);
    }

    /** An actual saved owner deadline cannot be extended by replaying a previously successful business command. */
    @Test void expiredSessionBlocksRetainedSuccess() throws Exception {
        Browser staff = staff("review_a"); var registration = register(staff, "1", "VENDOR", false); String key = key();
        status(staff.post(path(registration, "verify"), verify("VENDOR"), key, true), 200);
        doReturn(now.plus(Duration.ofHours(9))).when(clock).instant();
        status(staff.post(path(registration, "verify"), verify("VENDOR"), key, true), 401);
        assertThat(reviewAudits(registration)).isEqualTo(1);
    }

    /** Actual M00 logout/revocation, rather than a fixture fake response, prevents replay from restoring the old browser. */
    @Test void logoutBlocksRetainedSuccess() throws Exception {
        Browser staff = staff("review_a"); var registration = register(staff, "1", "VENDOR", false); String key = key();
        status(staff.post(path(registration, "verify"), verify("VENDOR"), key, true), 200);
        status(staff.post("/api/auth/logout", Map.of(), null, true), 204);
        // A new anonymous CSRF bootstrap proves denial is authentication, not merely a stale CSRF token.
        staff.csrf(); status(staff.post(path(registration, "verify"), verify("VENDOR"), key, true), 401);
        assertThat(reviewResults(registration)).isEqualTo(1);
    }

    /** Two saved contexts of the same USER/key/body converge to one result after the real root lock and second replay. */
    @Test void concurrentSameKeyHasOnePersistedDecision() throws Exception {
        Browser one = staff("review_a"), two = staff("review_a"); var registration = register(one, "1", "VENDOR", false); String key = key();
        var responses = race(() -> one.post(path(registration, "verify"), verify("VENDOR"), key, true),
                () -> two.post(path(registration, "verify"), verify("VENDOR"), key, true));
        assertThat(responses.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(200, 200);
        assertThat(tree(responses.get(0))).isEqualTo(tree(responses.get(1)));
        assertThat(reviewAudits(registration)).isEqualTo(1); assertThat(reviewResults(registration)).isEqualTo(1);
    }

    /** Different actor/key verify-versus-reject competition has exactly one terminal transition and one audit. */
    @Test void concurrentDifferentKeyVerifyRejectHasOneWinner() throws Exception {
        Browser one = staff("review_a"), two = staff("review_b"); var registration = register(one, "1", "VENDOR", false);
        var responses = race(() -> one.post(path(registration, "verify"), verify("VENDOR"), key(), true),
                () -> two.post(path(registration, "reject"), Map.of("expectedVersion", 0, "reasonCode", "INFORMATION_INCOMPLETE"), key(), true));
        assertThat(responses.stream().map(HttpResponse::statusCode)).containsExactlyInAnyOrder(200, 409);
        assertThat(jdbc.queryForObject("SELECT version FROM visitor_registrations WHERE id=?", Long.class, registration.id())).isEqualTo(1);
        assertThat(reviewAudits(registration)).isEqualTo(1); assertThat(reviewResults(registration)).isEqualTo(1);
    }

    /** An actual audit trigger fails after root mutation; status/version/metadata/audit/idempotency all roll back together. */
    @Test void actualAuditSqlFailureRollsBackEveryReviewWrite() throws Exception {
        Browser staff = staff("review_a"); var registration = register(staff, "1", "VENDOR", false); String key = key();
        jdbc.execute("CREATE TRIGGER m04_audit_failure BEFORE INSERT ON audit_events FOR EACH ROW BEGIN IF NEW.action IN ('REGISTRATION_VERIFIED','REGISTRATION_REJECTED') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='M04_DISPOSABLE_AUDIT_FAULT'; END IF; END");
        try { status(staff.post(path(registration, "verify"), verify("VENDOR"), key, true), 503); }
        finally { jdbc.execute("DROP TRIGGER m04_audit_failure"); }
        unchanged(registration); assertThat(tree(staff.get("/api/staff/registrations/" + registration.id())).path("review").isNull()).isTrue();
        assertThat(reviewAudits(registration)).isZero(); assertThat(reviewResults(registration)).isZero();
        status(staff.post(path(registration, "verify"), verify("VENDOR"), key, true), 200);
    }

    /** A controlled real 1062 fault tests rollback/new-transaction replay-only MISS; it is not a claimed natural root-lock race. */
    @Test void actualDuplicateKeyMissRecoveryNeverReappliesRoot() throws Exception {
        Browser staff = staff("review_a"); var registration = register(staff, "1", "VENDOR", false);
        clearInvocations(root, audit, idempotency);
        jdbc.execute("CREATE TRIGGER m04_unique_failure BEFORE INSERT ON idempotency_records FOR EACH ROW BEGIN IF NEW.operation='VERIFY' THEN SIGNAL SQLSTATE '23000' SET MYSQL_ERRNO=1062,MESSAGE_TEXT='M04_DISPOSABLE_UNIQUE_FAULT'; END IF; END");
        try { status(staff.post(path(registration, "verify"), verify("VENDOR"), key(), true), 409); }
        finally { jdbc.execute("DROP TRIGGER m04_unique_failure"); }
        unchanged(registration); assertThat(reviewAudits(registration)).isZero(); assertThat(reviewResults(registration)).isZero();
        org.mockito.Mockito.verify(root, times(1)).recordDecision(any(), anyLong(), anyString(), any());
        org.mockito.Mockito.verify(audit, times(1)).append(eq(LocalAuditPort.Action.REGISTRATION_VERIFIED), anyString(), anyString(), anyLong(), any());
        org.mockito.Mockito.verify(idempotency, times(1)).success(any(), any(), anyInt(), any());
    }

    /** A real contender commits after the unique loser's complete rollback; recovery reads that winner without reapplying. */
    @Test void actualDuplicateKeyRecoveryReadsCommittedSuccessfulWinner() throws Exception {
        winnerRecovery(false);
    }
    /** Two valid rejection reasons yield different hashes; a committed contender is not success for the loser's different body. */
    @Test void actualDuplicateKeyRecoveryRejectsDifferentBodyWinner() throws Exception {
        winnerRecovery(true);
    }

    /** Revocation wins before the service's fresh actor read; actual M00 policy/epoch mutation denies the waiting review. */
    @Test void concurrentPermissionRevocationBeforeReviewGuardPreventsDecision() throws Exception {
        Browser staff = staff("review_a"), admin = staff("review_admin"); var registration = register(staff, "1", "VENDOR", false);
        String owner = staff.owner(); var proof = admin.proof();
        var entered = new CountDownLatch(1); var release = new CountDownLatch(1); var readsBeforePrefix = new java.util.concurrent.atomic.AtomicInteger();
        doAnswer(call -> {
            // Protected servlet filter is call 1; service pre-TX requireHuman is call 2, with no retained domain locks.
            if (readsBeforePrefix.incrementAndGet() == 2) { entered.countDown(); if (!release.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Review guard barrier timed out"); }
            return call.callRealMethod();
        }).when(capabilities).requireHuman(anyString(), eq(owner), anyLong(), anyString());
        try (var pool = Executors.newSingleThreadExecutor()) {
            var pending = pool.submit(() -> staff.post(path(registration, "verify"), verify("VENDOR"), key(), true));
            try {
                assertThat(entered.await(10, TimeUnit.SECONDS)).isTrue();
                changes.counterPermission(proof, actor("review_a"), 1, 0, false);
            } finally { release.countDown(); }
            status(pending.get(20, TimeUnit.SECONDS), 401);
        }
        unchanged(registration); assertThat(reviewAudits(registration)).isZero(); assertThat(reviewResults(registration)).isZero();
    }

    /** A serialized review may commit before revocation; late framework-save denial yields an UNKNOWN acknowledgement, not business rollback. */
    @Test void concurrentRevocationAfterReviewPrefixPreservesSerializedWinner() throws Exception {
        Browser staff = staff("review_a"), admin = staff("review_admin"); var registration = register(staff, "1", "VENDOR", false);
        var proof = admin.proof(); long target = actor("review_a"); String commandKey = key();
        var inDecision = new CountDownLatch(1); var releaseDecision = new CountDownLatch(1); var adminWaiting = new CountDownLatch(1);
        var adminThread = new java.util.concurrent.atomic.AtomicReference<Thread>();
        doAnswer(call -> { inDecision.countDown(); if (!releaseDecision.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Review decision barrier timed out"); return call.callRealMethod(); })
                .when(root).recordDecision(any(), anyLong(), anyString(), any());
        doAnswer(call -> { if (Thread.currentThread() == adminThread.get()) adminWaiting.countDown(); return call.callRealMethod(); })
                .when(accounts).lock(target);
        HttpResponse<String> acknowledgement;
        try (var pool = Executors.newFixedThreadPool(2)) {
            var review = pool.submit(() -> staff.post(path(registration, "verify"), verify("VENDOR"), commandKey, true));
            assertThat(inDecision.await(10, TimeUnit.SECONDS)).isTrue();
            var revoked = pool.submit(() -> { adminThread.set(Thread.currentThread()); changes.counterPermission(proof, target, 1, 0, false); return true; });
            try { assertThat(adminWaiting.await(10, TimeUnit.SECONDS)).isTrue(); assertThat(revoked.isDone()).isFalse(); }
            finally { releaseDecision.countDown(); }
            acknowledgement = review.get(20, TimeUnit.SECONDS); assertThat(revoked.get(20, TimeUnit.SECONDS)).isTrue();
        }
        assertThat(jdbc.queryForObject("SELECT status FROM visitor_registrations WHERE id=?", String.class, registration.id())).isEqualTo("VERIFIED");
        assertThat(jdbc.queryForObject("SELECT version FROM visitor_registrations WHERE id=?", Long.class, registration.id())).isEqualTo(1);
        assertThat(reviewAudits(registration)).isEqualTo(1); assertThat(reviewResults(registration)).isEqualTo(1);
        // Only after SQL proves the complete domain commit can a late response failure be classified as acknowledgement uncertainty.
        assertThat(acknowledgement.statusCode()).isIn(200, 401, 503);
        if (acknowledgement.statusCode() == 503) {
            assertThat(tree(acknowledgement).path("code").asString()).isEqualTo("SERVICE_UNAVAILABLE");
            assertThat(tree(acknowledgement).path("message").asString()).isEqualTo("Request outcome unavailable. Keep the original command key.");
        }
        status(staff.post(path(registration, "verify"), verify("VENDOR"), commandKey, true), 401);
    }

    /** Controlled SQL 1062 occurs only on the loser's held connection; the independently authorized HTTP contender is wholly real. */
    private void winnerRecovery(boolean differentBody) throws Exception {
        Browser loser = staff("review_a"), winner = staff("review_a"); var registration = register(loser, "1", "VENDOR", false);
        String commandKey = key(), operation = differentBody ? "REJECT" : "VERIFY", action = differentBody ? "reject" : "verify";
        Object original = differentBody ? Map.of("expectedVersion", 0, "reasonCode", "INFORMATION_INCOMPLETE") : verify("VENDOR");
        Object winning = differentBody ? Map.of("expectedVersion", 0, "reasonCode", "INFORMATION_NOT_CONFIRMED") : verify("VENDOR");
        var first = new java.util.concurrent.atomic.AtomicBoolean(true); var winnerDone = new java.util.concurrent.atomic.AtomicBoolean();
        var recovered = new java.util.concurrent.atomic.AtomicBoolean(); var loserThread = new java.util.concurrent.atomic.AtomicReference<Thread>();
        var marker = new java.util.concurrent.atomic.AtomicReference<TransactionSynchronization>();
        var callbackError = new java.util.concurrent.atomic.AtomicReference<Throwable>();
        var decisions = new java.util.concurrent.ConcurrentHashMap<Thread, Integer>();
        // Configure the actual target spy, not the Spring MANDATORY proxy, so setting hooks itself performs no out-of-TX call.
        // Application requests still enter that real proxy and its required transaction before reaching the instrumented target.
        IdempotencyPort observedIdempotency = org.springframework.test.util.AopTestUtils.getUltimateTargetObject(idempotency);
        clearInvocations(root, audit, idempotency);
        doAnswer(call -> { decisions.merge(Thread.currentThread(), 1, Integer::sum); return call.callRealMethod(); })
                .when(root).recordDecision(any(), anyLong(), anyString(), any());
        doAnswer(call -> {
            if (Thread.currentThread() == loserThread.get() && winnerDone.get()) {
                assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
                assertThat(TransactionSynchronizationManager.getCurrentTransactionIsolationLevel()).isEqualTo(TransactionDefinition.ISOLATION_READ_COMMITTED);
                assertThat(TransactionSynchronizationManager.getSynchronizations().contains(marker.get())).isFalse(); recovered.set(true);
            }
            return call.callRealMethod();
        }).when(observedIdempotency).replay(any(), any());
        doAnswer(call -> {
            IdempotencyPort.Namespace namespace = call.getArgument(0);
            if (namespace.operation().equals(operation) && namespace.key().equals(commandKey) && first.compareAndSet(true, false)) {
                loserThread.set(Thread.currentThread()); jdbc.execute("SET @m04_force_unique=TRUE");
                var synchronization = new TransactionSynchronization() {
                    @Override public void afterCompletion(int status) {
                        try {
                            if (status != STATUS_ROLLED_BACK) throw new IllegalStateException("Unique loser did not roll back");
                            // No original locks survive the completed DB rollback; the contender can now take its real prefix and commit.
                            status(winner.post(path(registration, action), winning, commandKey, true), 200); winnerDone.set(true);
                        } catch (Throwable failure) { callbackError.set(failure); }
                        finally { jdbc.execute("SET @m04_force_unique=FALSE"); }
                    }
                };
                marker.set(synchronization); TransactionSynchronizationManager.registerSynchronization(synchronization);
            }
            return call.callRealMethod();
        }).when(observedIdempotency).success(any(), any(), anyInt(), any());
        jdbc.execute("CREATE TRIGGER m04_winner_failure BEFORE INSERT ON idempotency_records FOR EACH ROW BEGIN IF @m04_force_unique=TRUE THEN SIGNAL SQLSTATE '23000' SET MYSQL_ERRNO=1062,MESSAGE_TEXT='M04_DISPOSABLE_WINNER_FAULT'; END IF; END");
        try { status(loser.post(path(registration, action), original, commandKey, true), differentBody ? 409 : 200); }
        finally { jdbc.execute("DROP TRIGGER m04_winner_failure"); }
        assertThat(callbackError.get() == null).as("post-rollback real contender failed").isTrue(); assertThat(winnerDone).isTrue(); assertThat(recovered).isTrue();
        assertThat(decisions.size()).isEqualTo(2); assertThat(decisions.values()).containsOnly(1);
        assertThat(reviewAudits(registration)).isEqualTo(1); assertThat(reviewResults(registration)).isEqualTo(1);
        if (differentBody) assertThat(jdbc.queryForObject("SELECT reject_reason FROM visitor_registrations WHERE id=?", String.class, registration.id())).isEqualTo("INFORMATION_NOT_CONFIRMED");
    }

    /** Actual adapter transaction fencing must precede even an owner discovery query, not merely reject after reading it. */
    @Test void readScopeFactoryOutsideRcRejectsBeforeAnySql() throws Exception {
        Browser staff = staff("review_a"); String owner = staff.owner(); clearInvocations(jdbc);
        assertThatThrownBy(() -> reads.captureReadScope(owner, "1")).isInstanceOf(IllegalStateException.class);
        noSqlCalls();
    }

    /** Actual JDBC observations distinguish suspended/completed/double-use rejection from a successful original count/items operation. */
    @Test void actualReadScopeSuspensionOneUseAndCompletionAreFencedBeforeSql() throws Exception {
        Browser staff = staff("review_a"); var registration = register(staff, "1", "VENDOR", false); String owner = staff.owner();
        var original = new TransactionTemplate(transaction.getTransactionManager()); original.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        var nested = new TransactionTemplate(transaction.getTransactionManager()); nested.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        nested.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        var scope = original.execute(status -> {
            var captured = reads.captureReadScope(owner, "1");
            nested.executeWithoutResult(inner -> {
                clearInvocations(jdbc);
                assertThatThrownBy(() -> reads.readMaskedDetail(captured, registration.id())).isInstanceOf(IllegalStateException.class);
                noSqlCalls();
            });
            assertThat(reads.readMaskedQueue(captured, new RegistrationReadPort.ReadQuery(null, null, 0, 10)).total()).isEqualTo(1);
            clearInvocations(jdbc);
            assertThatThrownBy(() -> reads.readMaskedDetail(captured, registration.id())).isInstanceOf(IllegalStateException.class);
            noSqlCalls(); return captured;
        });
        clearInvocations(jdbc);
        assertThatThrownBy(() -> reads.readMaskedDetail(scope, registration.id())).isInstanceOf(IllegalStateException.class);
        noSqlCalls();
    }

    /** Observe SQL operations only: pure DataSource access is not SQL, and invocation arguments/secrets never become diagnostics. */
    private void noSqlCalls() {
        var operations = java.util.Set.of("query", "queryForObject", "queryForList", "queryForMap", "queryForRowSet", "queryForStream", "update", "batchUpdate", "execute", "call");
        assertThat(mockingDetails(jdbc).getInvocations().stream().anyMatch(call -> operations.contains(call.getMethod().getName())))
                .as("SQL before valid scope consumption").isFalse();
    }

    /** The frozen public shape is supplied from schema; no M03 private helper/constant or registration INSERT is used. */
    private Registration register(Browser staff, String counter, String category, boolean feedback) throws Exception {
        return register(staff, counter, category, feedback ? RAW_MRN : null);
    }
    /** A missing feedback token stays missing; transient synthetic feedback is not turned into an invented capability. */
    private Registration register(Browser staff, String counter, String category, String feedbackMrn) throws Exception {
        var created = staff.post("/api/staff/registration-qr-sessions", Map.of("counterId", counter), null, true); status(created, 201);
        String display = tree(created).path("displaySessionId").asString();
        var current = staff.get("/api/staff/registration-qr-sessions/" + display + "/current"); status(current, 200);
        String entry = tree(current).path("entryUrl").asString().split("#entry=")[1];
        Browser visitor = new Browser(); visitor.csrf(); var exchanged = visitor.post("/api/public/registration-entry/exchange", Map.of("entryToken", entry), null, true); status(exchanged, 200);
        Object context = json.convertValue(tree(exchanged).path("formContext"), Object.class);
        var schema = visitor.post("/api/public/registration-schema", Map.of("formContext", context), null, true); status(schema, 200);
        var body = new HashMap<String, Object>(); body.put("formContext", context); body.put("categoryCode", category);
        var formData = form(category); if (feedbackMrn != null) formData.put("mrn", feedbackMrn);
        body.put("fieldSchemaVersion", tree(schema).path("fieldSchemaVersion").asString()); body.put("formData", formData);
        body.put("privacyAcknowledgement", Map.of("acknowledged", true, "policyVersion", tree(schema).path("privacy").path("policyVersion").asString()));
        if (feedbackMrn != null) {
            var checked = visitor.post("/api/public/mrn-validations", Map.of("formContext", context, "mrn", feedbackMrn, "wardCode", "M04_WARD"), null, true);
            String expectedFeedback = switch (feedbackMrn) { case "DEMO-MRN-MATCH" -> "MATCH"; case "DEMO-MRN-TIMEOUT" -> "TIMEOUT"; case "DEMO-MRN-UNAVAILABLE" -> "UNAVAILABLE"; default -> "NO_MATCH"; };
            status(checked, 200); assertThat(tree(checked).path("feedback").asString()).isEqualTo(expectedFeedback);
            if (!tree(checked).path("validationToken").isNull()) body.put("mrnValidationToken", tree(checked).path("validationToken").asString());
        }
        var submitted = visitor.post("/api/public/registrations", body, key(), true); status(submitted, 201);
        String reference = tree(submitted).path("publicReference").asString();
        // Resolve the operational ID via the authorized real queue, never through a public PII lookup or root fixture query.
        var items = tree(staff.get("/api/staff/registrations?counterId=" + counter + "&pageSize=50")).path("items");
        for (var item : items) if (reference.equals(item.path("publicReference").asString())) return new Registration(item.path("id").asString(), reference, category);
        throw new IllegalStateException("Submitted synthetic reference absent from authorized queue");
    }
    /** Frozen synthetic category fields are independent of M03 private validators and never authorize scope or actor. */
    private Map<String, Object> form(String category) {
        var form = new HashMap<String, Object>(); form.put("fullName", RAW_NAME); form.put("identificationType", "TEST_ID");
        form.put("identificationNumber", RAW_ID); form.put("phone", RAW_PHONE);
        if (category.equals("PENJAGA")) { form.put("mrn", RAW_MRN); form.put("wardCode", "M04_WARD"); form.put("relationship", "PARENT"); }
        else {
            form.put(category.equals("EXECUTIVE") ? "organisation" : "company", "Synthetic Company");
            form.put("contactPerson", "Synthetic Contact"); form.put("destinationCode", "M04_OFFICE");
            form.put(switch (category) { case "EXECUTIVE" -> "visitPurpose"; case "VENDOR" -> "deliveryPurpose"; default -> "workPurpose"; }, "Synthetic purpose");
        }
        return form;
    }
    /** C09 basis/attestation sets stay explicit; server actor/time/source are absent from the command. */
    private Map<String, Object> verify(String category) {
        var body = new HashMap<String, Object>(); body.put("expectedVersion", 0); body.put("identityConfirmed", true);
        List<String> bases = category.equals("PENJAGA") ? List.of("IDENTITY_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED", "WARD_MATCH_CONFIRMED") : List.of("IDENTITY_MATCH_CONFIRMED");
        if (category.equals("PENJAGA")) { body.put("mrnConfirmed", true); body.put("wardConfirmed", true); }
        body.put("manualEvidence", Map.of("methodCode", "SYNTHETIC_RECORD_COMPARISON", "basisCodes", bases)); return body;
    }
    private long actor(String login) { return jdbc.queryForObject("SELECT id FROM users WHERE login=?", Long.class, login); }
    private long reviewAudits(Registration registration) { return jdbc.queryForObject("SELECT COUNT(*) FROM audit_events WHERE target_ref=? AND action IN ('REGISTRATION_VERIFIED','REGISTRATION_REJECTED')", Long.class, "REGISTRATION:" + registration.id()); }
    private long reviewResults(Registration registration) { return jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_records WHERE target_ref=? AND operation IN ('VERIFY','REJECT')", Long.class, registration.id()); }
    private void unchanged(Registration registration) {
        assertThat(jdbc.queryForObject("SELECT status FROM visitor_registrations WHERE id=?", String.class, registration.id())).isEqualTo("SUBMITTED");
        assertThat(jdbc.queryForObject("SELECT version FROM visitor_registrations WHERE id=?", Long.class, registration.id())).isZero();
    }
    private String path(Registration registration, String action) { return "/api/staff/registrations/" + registration.id() + "/" + action; }
    private String key() { return UUID.randomUUID().toString(); }
    private JsonNode tree(HttpResponse<String> response) { return json.readTree(response.body()); }
    private void status(HttpResponse<String> response, int expected) { assertThat(response.statusCode()).as("actual servlet status").isEqualTo(expected); }
    /** Boolean-only diagnostics avoid printing raw response data when a privacy assertion fails. */
    private void privateResponse(HttpResponse<String> response) {
        assertThat(response.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
        assertThat(List.of(RAW_NAME, RAW_ID, RAW_PHONE, RAW_MRN).stream().anyMatch(response.body()::contains)).as("raw synthetic markers exposed").isFalse();
        assertThat(response.body().contains("formData") || response.body().contains("form_data")).isFalse();
    }
    private Browser staff(String login) throws Exception { var browser = new Browser(); browser.login(login); return browser; }
    /** Timed independent HTTP clients make a hang/deadlock a bounded failure, without automatic command retries. */
    private List<HttpResponse<String>> race(java.util.concurrent.Callable<HttpResponse<String>> one, java.util.concurrent.Callable<HttpResponse<String>> two) throws Exception {
        try (var pool = Executors.newFixedThreadPool(2)) {
            var start = new CountDownLatch(1); List<Future<HttpResponse<String>>> futures = new ArrayList<>();
            for (var action : List.of(one, two)) futures.add(pool.submit(() -> { start.await(); return action.call(); }));
            start.countDown(); return List.of(futures.get(0).get(25, TimeUnit.SECONDS), futures.get(1).get(25, TimeUnit.SECONDS));
        }
    }
    /** Cookie and CSRF values remain private client memory; requests have deadlines and writes are never automatically repeated. */
    private final class Browser {
        private final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        private final HttpClient client = HttpClient.newBuilder().cookieHandler(cookies).connectTimeout(Duration.ofSeconds(5)).build();
        private String csrf;
        private String login;
        /** Real M00 administration proof is derived from this already saved server session, never supplied by a browser request body. */
        AccountChanges.Proof proof() {
            String cookie = cookies.getCookieStore().getCookies().stream().filter(value -> value.getName().equals("HSAAS_SESSION")).findFirst().orElseThrow().getValue();
            String session = new String(Base64.getDecoder().decode(cookie), java.nio.charset.StandardCharsets.UTF_8);
            var row = jdbc.queryForMap("SELECT b.id,b.current_owner_context_id,b.generation FROM app_session_bindings b JOIN SPRING_SESSION s ON s.PRIMARY_ID=b.spring_primary_id WHERE s.SESSION_ID=?", session);
            return new AccountChanges.Proof((String) row.get("id"), (String) row.get("current_owner_context_id"), ((Number) row.get("generation")).longValue(), login);
        }
        /** Reads only this saved test browser's server binding metadata; cookie/owner values never enter diagnostics or HTTP payloads. */
        String owner() {
            String cookie = cookies.getCookieStore().getCookies().stream().filter(value -> value.getName().equals("HSAAS_SESSION")).findFirst().orElseThrow().getValue();
            String session = new String(Base64.getDecoder().decode(cookie), java.nio.charset.StandardCharsets.UTF_8);
            return jdbc.queryForObject("SELECT b.current_owner_context_id FROM app_session_bindings b JOIN SPRING_SESSION s ON s.PRIMARY_ID=b.spring_primary_id WHERE s.SESSION_ID=?", String.class, session);
        }
        HttpResponse<String> get(String path) throws Exception {
            return client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(20)).GET().build(), HttpResponse.BodyHandlers.ofString());
        }
        HttpResponse<String> post(String path, Object body, String key, boolean token) throws Exception { return raw(path, json.writeValueAsString(body), key, token); }
        HttpResponse<String> raw(String path, String body, String key, boolean token) throws Exception {
            var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json");
            if (token) request.header("X-CSRF-TOKEN", csrf); if (key != null) request.header("Idempotency-Key", key);
            return client.send(request.POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
        }
        void csrf() throws Exception { var response = get("/api/public/csrf"); status(response, 200); csrf = tree(response).path("token").asString(); }
        void login(String login) throws Exception { csrf(); status(post("/api/auth/login", Map.of("login", login, "password", PASSWORD), null, true), 200); this.login = login; csrf(); }
    }
    /** Safe operational coordinates only, with no form/credential/token payload in diagnostics. */
    private record Registration(String id, String reference, String category) { }
}
