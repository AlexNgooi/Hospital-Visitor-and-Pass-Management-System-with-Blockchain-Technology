package eduupm.hsaas.registration.review;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.auth.Accounts;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.IdempotencyPort;
import eduupm.hsaas.common.LocalAuditPort;
import eduupm.hsaas.registration.RegistrationReviewPort;
import eduupm.hsaas.registration.RegistrationReadPort;

/** Review stays absent by default until the reviewed M03 root adapter can satisfy the real dependency. */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "hsaas.review.enabled", havingValue = "true")
public class ReviewConfiguration {
    /** Explicit enabling without a root adapter fails startup; there is no in-memory production fallback. */
    @Bean public ReviewService reviewService(RegistrationReviewPort root, SessionCapabilities capabilities, Accounts accounts,
            IdempotencyPort idempotency, LocalAuditPort audit, JsonMapper json, PlatformTransactionManager manager) {
        return new ReviewService(root, capabilities, accounts, idempotency, audit, json, manager);
    }
    /** Enabling now requires the real read facet as well; GET never falls back to a synthetic production queue. */
    @Bean public ReviewReadService reviewReadService(RegistrationReadPort reads, RegistrationReviewPort roots,
            SessionCapabilities capabilities, Accounts accounts, PlatformTransactionManager manager) {
        return new ReviewReadService(reads, roots, capabilities, accounts, manager);
    }
}
