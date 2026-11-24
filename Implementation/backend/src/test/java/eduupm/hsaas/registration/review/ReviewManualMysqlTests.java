package eduupm.hsaas.registration.review;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;

/** A separate real manual-mode application/schema verifies server configuration, without substituting a mock mode or root bean. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named="HSAAS_LOCAL_MYSQL_TESTS", matches="true")
class ReviewManualMysqlTests {
    @org.junit.jupiter.api.extension.RegisterExtension
    static final eduupm.hsaas.testing.LocalMysql MYSQL = eduupm.hsaas.testing.LocalMysql.create();
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired JsonMapper json;
    @Autowired PasswordEncoder passwords;
    private static final String PASSWORD = "Public-synthetic-manual_1";

    /** Actual manual adapter is assembled by production configuration; all other integration surfaces remain disabled. */
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", MYSQL::getJdbcUrl); properties.add("spring.datasource.username", MYSQL::getUsername);
        properties.add("spring.datasource.password", MYSQL::getPassword);
        properties.add("hsaas.environment", () -> "test"); properties.add("hsaas.secure-cookie", () -> "false");
        properties.add("hsaas.bootstrap.enabled", () -> "false"); properties.add("hsaas.reader-mode", () -> "disabled");
        properties.add("hsaas.mrn-mode", () -> "manual"); properties.add("hsaas.notification-mode", () -> "disabled");
        properties.add("hsaas.blockchain-mode", () -> "disabled"); properties.add("hsaas.qr.enabled", () -> "true");
        properties.add("hsaas.registration.enabled", () -> "true"); properties.add("hsaas.review.enabled", () -> "true");
        properties.add("hsaas.lifecycle.enabled", () -> "true");
        properties.add("hsaas.qr.origin", () -> "https://manual.example.test"); properties.add("hsaas.qr.active-key", () -> "manual_fixture");
        properties.add("hsaas.qr.keys.manual_fixture", () -> Base64.getEncoder().encodeToString(new byte[32]));
        properties.add("hsaas.hash-key-version", () -> "manual_fixture"); properties.add("hsaas.hash-key", () -> Base64.getEncoder().encodeToString(new byte[32]));
        properties.add("logging.level.root", () -> "WARN");
    }

    /** Manual UNAVAILABLE returns no feedback capability; real submission remains pending until three explicit synthetic staff checks. */
    @Test void manualReviewAndPassHandoverAcrossStaffShifts() throws Exception {
        jdbc.update("INSERT INTO users(id,login,password_hash,role,created_at,updated_at) VALUES(1,'manual_review',?,'COUNTER_STAFF',UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", passwords.encode(PASSWORD));
        jdbc.update("INSERT INTO visitor_categories(id,code,name) VALUES(1,'PENJAGA','Synthetic Penjaga')");
        jdbc.update("INSERT INTO destinations(id,code,name,destination_kind) VALUES(1,'M04_MANUAL','Synthetic manual ward','WARD')");
        jdbc.update("UPDATE users SET staff_access_enabled=TRUE WHERE id=1");
        jdbc.update("INSERT INTO users(id,login,password_hash,role,staff_access_enabled,created_at,updated_at) VALUES(2,'next_shift',?,'COUNTER_STAFF',TRUE,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))", passwords.encode(PASSWORD));
        String cardId = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO cards(id,card_code,category_id,category_code,status,enrolled_by,enrolled_at,data_origin,environment,enrollment_method) VALUES(?,'penj-1',1,'PENJAGA','AVAILABLE',1,UTC_TIMESTAMP(6),'SYNTHETIC','test','MANUAL')", cardId);
        Browser staff = signIn("manual_review");
        var display = staff.post("/api/staff/registration-qr-sessions", Map.of(), null); status(display, 201);
        var current = staff.get("/api/staff/registration-qr-sessions/" + tree(display).path("displaySessionId").asString() + "/current"); status(current, 200);
        String entry = tree(current).path("entryUrl").asString().split("#entry=")[1];
        Browser visitor = new Browser(); visitor.csrf(); var exchanged = visitor.post("/api/public/registration-entry/exchange", Map.of("entryToken", entry), null); status(exchanged, 200);
        Object context = json.convertValue(tree(exchanged).path("formContext"), Object.class);
        var schema = visitor.post("/api/public/registration-schema", Map.of("formContext", context), null); status(schema, 200);
        var feedback = visitor.post("/api/public/mrn-validations", Map.of("formContext", context, "mrn", "DEMO-MRN-MANUAL1"), null); status(feedback, 200);
        assertThat(tree(feedback).path("mode").asString()).isEqualTo("manual"); assertThat(tree(feedback).path("feedback").asString()).isEqualTo("UNAVAILABLE");
        assertThat(tree(feedback).path("validationToken").isNull()).isTrue(); assertThat(tree(feedback).path("expiresAt").isNull()).isTrue();
        var submitted = visitor.post("/api/public/registrations", Map.of("formContext", context, "categoryCode", "PENJAGA",
                "fieldSchemaVersion", tree(schema).path("fieldSchemaVersion").asString(), "privacyAcknowledgement", Map.of("acknowledged", true, "policyVersion", tree(schema).path("privacy").path("policyVersion").asString()),
                "termsAcknowledgement", Map.of("acknowledged",true,"policyVersion","penjaga-pass-terms-v1"),
                "formData", Map.of("fullName", "Synthetic Manual Visitor", "identificationType", "IC", "identificationNumber", "900101010001", "phone", "+60111112222",
                        "mrn", "DEMO-MRN-MANUAL1", "wardCode", "M04_MANUAL", "currentAddress", "Synthetic address")), UUID.randomUUID().toString()); status(submitted, 201);
        var queue = staff.get("/api/staff/registrations"); status(queue, 200);
        String id = tree(queue).path("items").get(0).path("id").asString();
        var detail = staff.get("/api/staff/registrations/" + id); status(detail, 200);
        assertThat(tree(detail).path("status").asString()).isEqualTo("SUBMITTED"); assertThat(tree(detail).path("mrnMode").asString()).isEqualTo("manual");
        assertThat(tree(detail).path("review").isNull()).isTrue();
        status(staff.post("/api/staff/registrations/" + id + "/verify", Map.of("expectedVersion", 0, "identityConfirmed", true), UUID.randomUUID().toString()), 400);
        var reviewed = staff.post("/api/staff/registrations/" + id + "/verify", Map.of("expectedVersion", 0, "identityConfirmed", true, "mrnConfirmed", true, "wardConfirmed", true,
                "manualEvidence", Map.of("methodCode", "SYNTHETIC_RECORD_COMPARISON", "basisCodes", List.of("IDENTITY_MATCH_CONFIRMED", "MRN_MATCH_CONFIRMED", "WARD_MATCH_CONFIRMED"))), UUID.randomUUID().toString()); status(reviewed, 200);
        var saved = staff.get("/api/staff/registrations/" + id); status(saved, 200);
        assertThat(tree(saved).path("review").path("source").asString()).isEqualTo("SYNTHETIC_MANUAL");
        assertThat(tree(saved).path("source").asString()).isEqualTo("SYNTHETIC");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_events WHERE action='REGISTRATION_VERIFIED'", Long.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_records WHERE operation='VERIFY'", Long.class)).isEqualTo(1);
        var pass = new java.util.HashMap<String,Object>(Map.of("cardId",cardId,"expectedVersion",0));
        pass.put("dueAt",null);
        status(staff.post("/api/staff/card-assignments", Map.of("registrationId",id,"expectedVersion",1,
                "handoverConfirmed",true,"passes",List.of(pass)), UUID.randomUUID().toString()), 200);

        // End the issuing shift before a different account opens the shared pass list.
        status(staff.post("/api/auth/logout", Map.of(), null), 204);
        Browser nextShift = signIn("next_shift");
        var feed = nextShift.post("/api/staff/passes/search", Map.of("history",false,"category","ALL","status","ALL","search",""), null);
        status(feed,200);
        var loan = tree(feed).path("items").get(0).path("assignment");
        assertThat(loan.path("issuedBy").asString()).isEqualTo("1");
        String assignment = loan.path("id").asString();
        status(nextShift.post("/api/staff/card-assignments/"+assignment+"/return",
                Map.of("expectedVersion",0,"physicalReceived",true),UUID.randomUUID().toString()),200);
        var returned = nextShift.get("/api/staff/card-assignments/"+assignment);
        status(returned,200);
        assertThat(tree(returned).path("issuedBy").asString()).isEqualTo("1");
        assertThat(tree(returned).path("returnedBy").asString()).isEqualTo("2");
    }

    private Browser signIn(String login) throws Exception {
        Browser browser = new Browser();
        browser.csrf();
        status(browser.post("/api/auth/login", Map.of("login",login,"password",PASSWORD), null),200);
        browser.csrf();
        return browser;
    }
    private JsonNode tree(HttpResponse<String> response) { return json.readTree(response.body()); }
    private void status(HttpResponse<String> response, int expected) { assertThat(response.statusCode()).as("actual manual servlet status").isEqualTo(expected); }
    /** Independent real jars/CSRF stay private; all writes are explicit single attempts with bounded request deadlines. */
    private final class Browser {
        private final HttpClient client = HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).connectTimeout(Duration.ofSeconds(5)).build();
        private String csrf;
        HttpResponse<String> get(String path) throws Exception { return client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(20)).GET().build(), HttpResponse.BodyHandlers.ofString()); }
        HttpResponse<String> post(String path, Object body, String key) throws Exception {
            var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json").header("X-CSRF-TOKEN", csrf);
            if (key != null) request.header("Idempotency-Key", key);
            return client.send(request.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(), HttpResponse.BodyHandlers.ofString());
        }
        void csrf() throws Exception { var response = get("/api/public/csrf"); status(response, 200); csrf = tree(response).path("token").asString(); }
    }
}
