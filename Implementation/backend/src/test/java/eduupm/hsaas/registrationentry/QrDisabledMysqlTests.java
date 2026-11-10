package eduupm.hsaas.registrationentry;

import java.net.URI;
import java.net.http.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import static org.assertj.core.api.Assertions.*;

/** Disabled QR creates no domain state; this fixture can reach only its explicitly owned native test schema. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable(named="HSAAS_LOCAL_MYSQL_TESTS", matches="true")
class QrDisabledMysqlTests {
    @org.junit.jupiter.api.extension.RegisterExtension
    static final eduupm.hsaas.testing.LocalMysql MYSQL = eduupm.hsaas.testing.LocalMysql.create();
    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url",MYSQL::getJdbcUrl);properties.add("spring.datasource.username",MYSQL::getUsername);properties.add("spring.datasource.password",MYSQL::getPassword);
        properties.add("hsaas.qr.enabled",()->"false");
    }
    /** Capability read is minimal; disabled stateful calls gate before role/CSRF and cannot write QR rows. */
    @Test void disabledCapabilityAndNoWrites() throws Exception {
        var client=HttpClient.newHttpClient();
        var capability=client.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/public/registration-entry/capabilities")).GET().build(),HttpResponse.BodyHandlers.ofString());
        assertThat(capability.statusCode()).isEqualTo(200);assertThat(capability.body()).isEqualTo("{\"enabled\":false}");
        assertThat(capability.headers().firstValue("cache-control")).contains("no-store");assertThat(capability.headers().firstValue("referrer-policy")).contains("no-referrer");
        for(String path:java.util.List.of("/api/public/registration-entry/exchange","/api/staff/registration-qr-sessions","/api/staff/registration-qr-sessions/invalid/revoke")) {
            var response=client.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+path)).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString("{}")).build(),HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).isEqualTo(409);assertThat(response.body()).contains("INTEGRATION_DISABLED");
        }
        for(String table:java.util.List.of("registration_qr_sessions","registration_qr_challenges","registration_entry_contexts","registration_entry_grants")) {
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class)).isZero();
        }
    }
}
