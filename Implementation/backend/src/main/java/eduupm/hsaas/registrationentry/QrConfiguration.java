package eduupm.hsaas.registrationentry;

import java.time.Clock;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.config.FoundationProperties;

/** QR is explicitly enabled with a valid keyring; disabled applications expose no registration capability. */
@Configuration
@ConditionalOnProperty(name="hsaas.qr.enabled",havingValue="true")
@EnableConfigurationProperties(QrProperties.class)
public class QrConfiguration {
    /** Signing secrets stay in the backend and are checked before the enabled application becomes ready. */
    @Bean public QrTokenCodec qrTokens(QrProperties properties,JsonMapper json) { return new QrTokenCodec(properties,json); }
    /** Migration completes before key retirement or any QR table can be inspected. */
    @Bean @DependsOnDatabaseInitialization
    public QrEntryService qrEntries(JdbcTemplate jdbc,TransactionTemplate tx,Clock clock,
            SessionCapabilities capabilities,QrProperties properties,FoundationProperties foundation,QrTokenCodec tokens) {
        return new QrEntryService(jdbc,tx,clock,capabilities,properties,foundation,tokens);
    }
}
