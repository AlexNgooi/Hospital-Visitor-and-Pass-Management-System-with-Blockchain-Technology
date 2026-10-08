package eduupm.hsaas;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.auth.LoginNames;
import eduupm.hsaas.common.*;
import eduupm.hsaas.config.FoundationProperties;
import eduupm.hsaas.config.SessionConfig;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.session.web.http.CookieSerializer;
import static org.assertj.core.api.Assertions.*;

/** Fixed contract vectors catch normalization and encoding changes before downstream modules use them. */
class FoundationContractTests {
    /** Account and socket limits remain effective independently; a later minute permits a fresh attempt. */
    @Test void loginThrottleAndMinuteReset() {
        InstantClock clock=new InstantClock(); var limiter=new eduupm.hsaas.auth.LoginLimiter(clock);
        for(int i=0;i<10;i++) { limiter.check("staff_test","127.0.0."+i); }
        assertThatThrownBy(()->limiter.check("staff_test","127.0.0.99"))
                .isInstanceOfSatisfying(ApiFailure.class,failure->assertThat(failure.status()).isEqualTo(429));
        for(int i=0;i<60;i++) { limiter.check("staff_"+i,"fixed-address"); }
        assertThatThrownBy(()->limiter.check("fresh_staff","fixed-address")).isInstanceOf(ApiFailure.class);
        clock.now=clock.now.plusSeconds(60); limiter.check("staff_test","fixed-address");
        for(int i=0;i<120;i++) { limiter.checkBootstrap("bootstrap-address"); }
        assertThatThrownBy(()->limiter.checkBootstrap("bootstrap-address")).isInstanceOf(ApiFailure.class);
    }

    /** Retained keys preserve old hashes; missing, malformed, and short keys fail closed. */
    @Test void versionedHmacKeyRetention() {
        String old=java.util.Base64.getEncoder().encodeToString("public-synthetic-old-key-32-bytes!!".getBytes(StandardCharsets.UTF_8));
        String current=java.util.Base64.getEncoder().encodeToString("public-synthetic-new-key-32-bytes!!".getBytes(StandardCharsets.UTF_8));
        var jdbc=org.mockito.Mockito.mock(org.springframework.jdbc.core.JdbcTemplate.class);
        var json=JsonMapper.builder().build(); var clock=java.time.Clock.systemUTC();
        var before=new IdempotencyPort(jdbc,json,clock,hashProperties("old",old,Map.of()));
        var after=new IdempotencyPort(jdbc,json,clock,hashProperties("new",current,Map.of("old",old)));
        byte[] input="public-fixture".getBytes(StandardCharsets.UTF_8);
        assertThat(after.hash(input,"old")).isEqualTo(before.hash(input,"old"));
        assertThat(after.hash(input,"new")).isNotEqualTo(before.hash(input,"old"));
        assertThatThrownBy(()->after.hash(input,"removed"))
                .isInstanceOfSatisfying(ApiFailure.class,failure->assertThat(failure.status()).isEqualTo(503));
        for(String invalid:List.of("not base64",java.util.Base64.getEncoder().encodeToString(new byte[31]))) {
            assertThatThrownBy(()->new IdempotencyPort(jdbc,json,clock,hashProperties("bad",invalid,Map.of()))).isInstanceOf(IllegalStateException.class);
        }
    }

    /** Public synthetic settings exercise key rotation without a secret file or environment lookup. */
    private static FoundationProperties hashProperties(String version,String key,Map<String,String> retained) {
        return new FoundationProperties("test","disabled","manual","disabled","disabled",false,
                Duration.ofMinutes(30),Duration.ofHours(8),Duration.ofHours(24),Duration.ofMinutes(1),version,key,retained);
    }
    /** A deterministic test clock advances only when the limiter test explicitly requests it. */
    private static final class InstantClock extends java.time.Clock {
        private java.time.Instant now=java.time.Instant.parse("2026-10-09T00:00:00Z");
        @Override public java.time.ZoneId getZone() { return java.time.ZoneOffset.UTC; }
        @Override public java.time.Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public java.time.Instant instant() { return now; }
    }
    /** Production cookie policy is independent of an untrusted forwarded protocol header. */
    @Test void productionCookieAndSafeErrorDetails() throws Exception {
        var request=new MockHttpServletRequest(); request.addHeader("X-Forwarded-Proto","http");
        var response=new MockHttpServletResponse();
        new SessionConfig().cookieSerializer(properties("production","disabled","disabled",true))
                .writeCookieValue(new CookieSerializer.CookieValue(request,response,"public-fixture-cookie"));
        String cookie=response.getHeader("Set-Cookie");
        assertThat(cookie).contains("HSAAS_SESSION=","Path=/","Secure","HttpOnly","SameSite=Lax").doesNotContain("Domain=","Max-Age=");
        var json=JsonMapper.builder().build(); var errors=new ApiErrors(java.time.Clock.systemUTC(),json);
        response=new MockHttpServletResponse(); errors.write(request,response,ApiFailure.unauthenticated());
        assertThat(response.getContentAsString()).doesNotContain("details");
        Object timestamp=json.readValue(response.getContentAsString(),Map.class).get("timestamp");
        assertThat(timestamp).isInstanceOf(String.class); assertThat(java.time.Instant.parse((String)timestamp)).isNotNull();
        var context=new RestartDetails.FormContext("fixture_grant",1);
        var scope=new RestartDetails.Scope("test","1",null);
        var failure=new ApiFailure(409,"REGISTRATION_ENTRY_RESTART_REQUIRED","Confirm restart.",List.of(),new RestartDetails(context,scope,scope));
        response=new MockHttpServletResponse(); errors.write(request,response,failure);
        assertThat(response.getContentAsString()).contains("\"details\":","\"counterId\":\"1\"","\"categoryScope\":null");
        assertThatThrownBy(()->new RestartDetails.FormContext("fixture_grant",9007199254740992L)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->new ApiFailure(400,"VALIDATION_FAILED","Safe",List.of(),failure.details())).isInstanceOf(IllegalArgumentException.class);
    }
    /** Unicode case folding must not turn forbidden non-ASCII characters into valid staff accounts. */
    @Test void canonicalAccountsRejectAliases() {
        assertThat(LoginNames.canonical(" STAFF_001 ")).isEqualTo("staff_001");
        for(String invalid:List.of("ab","a@b","staff name","\tstaff_001","\u212Aelvin","staff\n","staff"+"a".repeat(65))) {
            assertThatThrownBy(()->LoginNames.canonical(invalid)).isInstanceOf(ApiFailure.class);
        }
    }

    /** The golden bytes are a versioned DTO format, deliberately independent of raw JSON object order. */
    @Test void encodingGoldenVectorAndPresence() {
        var json=JsonMapper.builder().build(); var scope=new RequestEncoding.Scope(RequestEncoding.Kind.USER,"7");
        byte[] value=RequestEncoding.encode(json,scope,"VERIFY","12",1,List.of(RequestEncoding.Field.integer("expectedVersion",0),RequestEncoding.Field.nil("note")));
        assertThat(new String(value,StandardCharsets.UTF_8)).isEqualTo("[\"HSAAS_REQUEST\",1,\"USER\",\"7\",\"VERIFY\",\"12\",1,[[\"expectedVersion\",\"VALUE\",\"INTEGER\",\"0\"],[\"note\",\"NULL\"]]]");
        byte[] missing=RequestEncoding.encode(json,scope,"VERIFY","12",1,List.of(RequestEncoding.Field.integer("expectedVersion",0),RequestEncoding.Field.missing("note")));
        assertThat(missing).isNotEqualTo(value);
        assertThat(RequestEncoding.Field.enumSet("basisCodes",List.of("WARD_MATCH_CONFIRMED","IDENTITY_MATCH_CONFIRMED")))
                .isEqualTo(RequestEncoding.Field.enumSet("basisCodes",List.of("IDENTITY_MATCH_CONFIRMED","WARD_MATCH_CONFIRMED")));
        assertThatThrownBy(()->RequestEncoding.Field.enumSet("basisCodes",List.of("IDENTITY_MATCH_CONFIRMED","IDENTITY_MATCH_CONFIRMED"))).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(()->RequestEncoding.Field.text("value","\uD800")).isInstanceOf(ApiFailure.class);
        assertThat(RequestEncoding.Field.instant("at",java.time.Instant.parse("2026-10-09T00:00:00Z")).wire())
                .contains("2026-10-09T00:00:00.000000Z");
        assertThatThrownBy(()->RequestEncoding.Field.instant("at",java.time.Instant.parse("2026-10-09T00:00:00.000000001Z"))).isInstanceOf(ApiFailure.class);
    }

    /** UUID v4 keys are canonicalized; other UUID versions never become accepted command identifiers. */
    @Test void commandKeyContract() {
        assertThat(IdempotencyPort.key("09FBD5B9-6312-478E-BA27-F85056C9875D")).isEqualTo("09fbd5b9-6312-478e-ba27-f85056c9875d");
        assertThatThrownBy(()->IdempotencyPort.key("09fbd5b9-6312-178e-ba27-f85056c9875d")).isInstanceOf(ApiFailure.class);
    }

    /** Current release startup cannot silently turn on physical simulation or provider integrations. */
    @Test void modeValidation() {
        properties("production","disabled","disabled",true).validate();
        properties("test","mock","disabled",false).validate();
        assertThatThrownBy(()->properties("production","mock","disabled",true).validate()).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->properties("production","disabled","live",true).validate()).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->properties("production","disabled","disabled",false).validate()).isInstanceOf(IllegalStateException.class);
    }
    private static FoundationProperties properties(String environment,String reader,String notification,boolean secure) {
        return new FoundationProperties(environment,reader,"manual",notification,"disabled",secure,Duration.ofMinutes(30),Duration.ofHours(8),Duration.ofHours(24),Duration.ofMinutes(1),"","",Map.of());
    }
}
