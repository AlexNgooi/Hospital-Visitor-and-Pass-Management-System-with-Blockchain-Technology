package eduupm.hsaas.registration;

import java.time.Clock;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.auth.*;
import eduupm.hsaas.common.*;
import eduupm.hsaas.config.FoundationProperties;
import eduupm.hsaas.hospital.*;
import eduupm.hsaas.registrationentry.QrEntryService;

/** Explicit enablement supplies a real persisted root; unavailable QR or production policy fails closed, without a mock root fallback. */
@Configuration
@ConditionalOnProperty(name = "hsaas.registration.enabled", havingValue = "true")
@org.springframework.scheduling.annotation.EnableScheduling
public class RegistrationConfiguration {
    @Bean @DependsOnDatabaseInitialization
    public RegistrationStore registrations(JdbcTemplate jdbc, JsonMapper json, Clock clock, Accounts accounts,
            SessionCapabilities capabilities, FoundationProperties properties) {
        if (!Set.of("development", "synthetic", "test").contains(properties.environment())) {
            throw new IllegalStateException("Production registration requires a future approved hospital schema and privacy policy");
        }
        return new RegistrationStore(jdbc, json, clock, accounts, capabilities);
    }
    /** The adapter is local synthetic/manual only and has no network/client-selected live mode. */
    @Bean public HospitalVerificationPort hospitalFeedback(FoundationProperties properties) {
        return new SyntheticHospitalAdapter(properties.mrnMode());
    }
    @Bean public RegistrationService registrationService(JdbcTemplate jdbc, JsonMapper json, Clock clock, TransactionTemplate tx,
            QrEntryService entries, SessionCapabilities capabilities, RegistrationStore store, LocalAuditPort audit,
            IdempotencyPort commands, FoundationProperties properties, HospitalVerificationPort hospital) {
        return new RegistrationService(jdbc, json, clock, tx, entries, capabilities, store, audit, commands, properties, hospital);
    }
    /** Only bounded expired temporary feedback is removed; this does not invent a registration-history retention policy. */
    @Bean public FeedbackCleanup feedbackCleanup(RegistrationService service) { return new FeedbackCleanup(service); }

    public static final class FeedbackCleanup {
        private final RegistrationService service;
        public FeedbackCleanup(RegistrationService service) { this.service = service; }
        @org.springframework.scheduling.annotation.Scheduled(fixedDelay = 60000, initialDelay = 60000)
        public void cleanup() { service.cleanupFeedback(); }
    }
}
