package eduupm.hsaas.registration;

import java.time.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.auth.*;
import eduupm.hsaas.common.*;
import eduupm.hsaas.config.FoundationProperties;
import eduupm.hsaas.hospital.SyntheticHospitalAdapter;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Default-off and unavailable dependencies fail closed before any native database or hospital connection can be used. */
class RegistrationConfigurationTests {
    private final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    private ApplicationContextRunner configuration(String environment) {
        var properties=new FoundationProperties(environment,"disabled","mock","disabled","disabled",true,
                Duration.ofMinutes(30),Duration.ofHours(8),Duration.ofHours(24),Duration.ofMinutes(1),"fixture","",Map.of());
        return new ApplicationContextRunner().withUserConfiguration(RegistrationConfiguration.class,RegistrationController.class)
                .withBean(FoundationProperties.class,()->properties).withBean(JdbcTemplate.class,()->jdbc)
                .withBean(JsonMapper.class,JsonMapper::new).withBean(Clock.class,()->Clock.systemUTC())
                .withBean(Accounts.class,()->mock(Accounts.class)).withBean(SessionCapabilities.class,()->mock(SessionCapabilities.class))
                .withBean(TransactionTemplate.class,()->mock(TransactionTemplate.class)).withBean(LocalAuditPort.class,()->mock(LocalAuditPort.class))
                .withBean(IdempotencyPort.class,()->mock(IdempotencyPort.class));
    }
    /** Disabled registration contributes no public HTTP controller, root, scheduled cleanup or feedback adapter. */
    @Test void defaultOffHasNoRootOrPublicController() {
        configuration("test").run(context->{
            assertThat(context).hasNotFailed().doesNotHaveBean(RegistrationStore.class).doesNotHaveBean(RegistrationController.class)
                    .doesNotHaveBean(RegistrationService.class).doesNotHaveBean(RegistrationConfiguration.FeedbackCleanup.class);
        });
        assertNoSql();
    }
    /** The current demo schema cannot be enabled in production even if infrastructure beans exist. */
    @Test void productionEnablementFailsBeforeSql() {
        configuration("production").withBean(eduupm.hsaas.registrationentry.QrEntryService.class,()->mock(eduupm.hsaas.registrationentry.QrEntryService.class))
                .withPropertyValues("hsaas.registration.enabled=true").run(context->
                assertThat(context).hasFailed().getFailure().hasStackTraceContaining("Production registration requires"));
        assertNoSql();
    }
    /** Explicit registration enablement without the real QR grant port must never install a fake root/grant fallback. */
    @Test void enabledWithoutQrDependencyFailsBeforeSql() {
        configuration("test").withPropertyValues("hsaas.registration.enabled=true").run(context->
                assertThat(context).hasFailed().getFailure().hasStackTraceContaining("QrEntryService"));
        assertNoSql();
    }
    /** Local synthetic feedback has fixed bounded statuses only; manual mode cannot silently claim a mock match. */
    @Test void mockAndManualFeedbackStaySynthetic() {
        var mock=new SyntheticHospitalAdapter("mock");
        assertThat(mock.verify("DEMO-MRN-4821","DEMO_WARD").name()).isEqualTo("MATCH");
        assertThat(mock.verify("DEMO-MRN-TIMEOUT","DEMO_WARD").name()).isEqualTo("TIMEOUT");
        assertThat(mock.verify("DEMO-MRN-UNAVAILABLE","DEMO_WARD").name()).isEqualTo("UNAVAILABLE");
        assertThat(mock.verify("DEMO-MRN-9999","DEMO_WARD").name()).isEqualTo("NO_MATCH");
        assertThat(new SyntheticHospitalAdapter("manual").verify("DEMO-MRN-4821","DEMO_WARD").name()).isEqualTo("UNAVAILABLE");
    }
    /** Spring invokes InitializingBean on the mock; this lifecycle call is not a database operation. */
    private void assertNoSql() {
        verify(jdbc).afterPropertiesSet();
        verifyNoMoreInteractions(jdbc);
    }
}
