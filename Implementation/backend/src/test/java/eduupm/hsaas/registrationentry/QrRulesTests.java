package eduupm.hsaas.registrationentry;

import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import org.junit.jupiter.api.Test;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.config.FoundationConfig;
import static org.assertj.core.api.Assertions.*;

/** Deterministic boundary and signature vectors supplement, rather than replace, actual database tests. */
class QrRulesTests {
    private final String fixtureKey=Base64.getEncoder().encodeToString(new byte[32]);
    private QrTokenCodec codec() { return new QrTokenCodec(new QrProperties(true,"https://entry.example.test","fixture",Map.of("fixture",fixtureKey)),new FoundationConfig().jsonMapper()); }
    /** Late reads keep the original expiry and exact slot changes occur at thirty seconds. */
    @Test void fixedSlotAndOverlap() {
        Instant epoch=Instant.parse("2026-10-09T00:00:00.123456Z");
        assertThat(RotationWindow.at(epoch,epoch.plusSeconds(29)).expiresAt()).isEqualTo(epoch.plusSeconds(45));
        assertThat(RotationWindow.at(epoch,epoch.plusSeconds(30)).slot()).isEqualTo(1);
        assertThat(RotationWindow.at(epoch,epoch.plusSeconds(45)).expiresAt()).isEqualTo(epoch.plusSeconds(75));
        assertThat(RotationWindow.at(epoch,epoch.plusSeconds(600)).slot()).isEqualTo(20);
        assertThatThrownBy(()->RotationWindow.at(epoch,epoch.minusNanos(1))).isInstanceOf(IllegalStateException.class);
    }
    /** Only a configured HTTPS origin or explicit local test origin can appear in an entry URL. */
    @Test void controlledOrigins() {
        for(String bad:java.util.List.of("http://entry.example.test","https://user:pass@entry.example.test","https://entry.example.test/path","https://entry.example.test#token","https://entry.example.test?value=1")) {
            assertThatThrownBy(()->new QrProperties(true,bad,"fixture",Map.of()).validatedOrigin("production")).isInstanceOf(IllegalStateException.class);
        }
        assertThat(new QrProperties(true,"http://localhost:5192","fixture",Map.of()).validatedOrigin("test").toString()).isEqualTo("http://localhost:5192");
        assertThatThrownBy(()->new QrProperties(true,"http://localhost:5192","fixture",Map.of()).validatedOrigin("synthetic")).isInstanceOf(IllegalStateException.class);
    }
    /** Missing, malformed, undersized, or wrongly selected keys fail startup without showing their values. */
    @Test void keyConfigurationFailsClosed() {
        for(var properties:java.util.List.of(new QrProperties(true,"https://entry.example.test","missing",Map.of("fixture",fixtureKey)),
                new QrProperties(true,"https://entry.example.test","fixture",Map.of("fixture","invalid")),
                new QrProperties(true,"https://entry.example.test","fixture",Map.of("fixture",Base64.getEncoder().encodeToString(new byte[31]))))) {
            assertThatThrownBy(()->new QrTokenCodec(properties,new FoundationConfig().jsonMapper())).isInstanceOf(IllegalStateException.class);
        }
    }
    /** Enabling the actual module configuration without keys fails context startup, not merely its first request. */
    @Test void enabledModuleFailsStartupWithoutKey() {
        new org.springframework.boot.test.context.runner.ApplicationContextRunner()
                .withUserConfiguration(QrConfiguration.class)
                .withBean(tools.jackson.databind.json.JsonMapper.class,()->new FoundationConfig().jsonMapper())
                .withPropertyValues("hsaas.qr.enabled=true","hsaas.qr.origin=https://entry.example.test","hsaas.qr.active-key=missing")
                .run(context->assertThat(context.getStartupFailure()).hasRootCauseMessage("QR requires an explicit active key and valid retained 256-bit keys"));
    }
    /** Compact signing is stable per challenge and any changed signature/header/payload is rejected. */
    @Test void strictSignatureAndHeader() throws Exception {
        QrTokenCodec codec=codec();var payload=new QrTokenCodec.Payload(1,"a064038e-85cc-432f-af75-023fa487f476","A".repeat(43),"2026-10-09T00:00:45.000000Z");
        String value=codec.encode(payload,"fixture");
        assertThat(value.equals(codec.encode(payload,"fixture"))).isTrue();
        assertThat(codec.decode(value).payload().cid()).isEqualTo(payload.cid());
        String[] parts=value.split("\\.");
        for(String malformed:java.util.List.of("x".repeat(2049),"invalid",parts[0]+"."+parts[1]+"."+"A".repeat(43))) {
            assertThatThrownBy(()->codec.decode(malformed)).isInstanceOfSatisfying(ApiFailure.class,f->assertThat(f.code()).isEqualTo("QR_ENTRY_INVALID"));
        }
        for(String header:java.util.List.of("{\"alg\":\"none\",\"typ\":\"hsaas-entry+jws\",\"kid\":\"fixture\"}",
                "{\"alg\":\"HS256\",\"typ\":\"hsaas-entry+jws\",\"kid\":\"fixture\",\"jku\":\"https://invalid.test\"}",
                "{\"alg\":\"HS256\",\"alg\":\"HS256\",\"typ\":\"hsaas-entry+jws\",\"kid\":\"fixture\"}",
                "{\"alg\":\"HS256\",\"typ\":\"hsaas-entry+jws\",\"kid\":5}")) {
            String substituted=Base64.getUrlEncoder().withoutPadding().encodeToString(header.getBytes(java.nio.charset.StandardCharsets.UTF_8))+"."+parts[1]+"."+parts[2];
            assertThatThrownBy(()->codec.decode(substituted)).isInstanceOf(ApiFailure.class);
        }
        assertThatThrownBy(()->codec.encode(payload,"removed")).isInstanceOfSatisfying(ApiFailure.class,f->assertThat(f.status()).isEqualTo(503));
    }
    /** The limiter is bounded, time-based, and does not key on a reusable public challenge. */
    @Test void boundedRateLimitAndReset() {
        var clock=org.mockito.Mockito.mock(java.time.Clock.class);
        org.mockito.Mockito.when(clock.instant()).thenReturn(Instant.parse("2026-10-09T00:00:00Z"));
        var limiter=new EntryLimiter(clock);
        for(int i=0;i<30;i++) { limiter.check("browser","loopback"); }
        assertThatThrownBy(()->limiter.check("browser","loopback")).isInstanceOfSatisfying(ApiFailure.class,f->assertThat(f.status()).isEqualTo(429));
        org.mockito.Mockito.when(clock.instant()).thenReturn(Instant.parse("2026-10-09T00:01:00Z"));limiter.check("browser","loopback");
    }
}
