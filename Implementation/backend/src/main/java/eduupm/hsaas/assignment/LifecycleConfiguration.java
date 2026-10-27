package eduupm.hsaas.assignment;

import java.time.Clock;
import java.util.Set;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.PlatformTransactionManager;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.auth.*;
import eduupm.hsaas.common.*;
import eduupm.hsaas.config.FoundationProperties;
import eduupm.hsaas.monitoring.OverdueMonitor;
import eduupm.hsaas.reader.SyntheticReader;
import eduupm.hsaas.registration.*;

/** Manual lifecycle needs explicit synthetic/test opt-in, but never an enabled reader or fake registration root. */
@Configuration(proxyBeanMethods=false)
@ConditionalOnProperty(name="hsaas.lifecycle.enabled",havingValue="true")
@EnableScheduling
public class LifecycleConfiguration {
    @Bean public LifecycleService lifecycleService(JdbcTemplate jdbc,Accounts accounts,SessionCapabilities capabilities,
            RegistrationLifecyclePort roots,RegistrationReviewPort reviewRoots,IdempotencyPort idem,LocalAuditPort audit,
            JsonMapper json,Clock clock,FoundationProperties properties,PlatformTransactionManager manager) {
        if(!Set.of("synthetic","test").contains(properties.environment())) {
            throw new IllegalStateException("Lifecycle requires an explicit synthetic/test environment");
        }
        return new LifecycleService(new LifecycleStore(jdbc),accounts,capabilities,roots,reviewRoots,new SyntheticReader(),idem,audit,json,clock,properties,manager);
    }
    @Bean public OverdueMonitor overdueMonitor(LifecycleService service) { return new OverdueMonitor(service); }
}
