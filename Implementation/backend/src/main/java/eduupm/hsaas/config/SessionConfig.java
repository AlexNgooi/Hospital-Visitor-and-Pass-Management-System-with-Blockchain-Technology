package eduupm.hsaas.config;

import javax.sql.DataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.session.FlushMode;
import org.springframework.session.config.annotation.web.http.EnableSpringHttpSession;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import eduupm.hsaas.auth.GuardedSessionRepository;
import eduupm.hsaas.auth.SessionCapabilities;

/** Configures the pinned JDBC implementation explicitly so lifecycle saves always pass the guard hook. */
@Configuration
@EnableSpringHttpSession
@EnableScheduling
public class SessionConfig {
    /** JPA and JDBC share one DataSource/transaction; domain templates prepare READ_COMMITTED isolation. */
    @Bean public PlatformTransactionManager transactionManager(EntityManagerFactory entities,DataSource source) {
        var manager=new JpaTransactionManager(entities);
        manager.setDataSource(source);
        return manager;
    }
    /** Joins the caller's transaction; it never independently commits a grant or audit change. */
    @Bean public TransactionTemplate domainTransactions(PlatformTransactionManager manager) {
        var tx=new TransactionTemplate(manager); tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        tx.setTimeout(5); return tx;
    }
    /** Framework persistence keeps its official isolated transaction, outside all domain locks. */
    @Bean public GuardedSessionRepository sessionRepository(JdbcTemplate jdbc, PlatformTransactionManager manager,
            SessionCapabilities capabilities, FoundationProperties properties) {
        var frameworkTx=new TransactionTemplate(manager); frameworkTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        var delegate=new JdbcIndexedSessionRepository(jdbc,frameworkTx);
        delegate.setDefaultMaxInactiveInterval(properties.requestIdle()); delegate.setFlushMode(FlushMode.ON_SAVE);
        return new GuardedSessionRepository(delegate,capabilities);
    }
    /** Host-only session cookies are secure by default and never persistent browser credentials. */
    @Bean public CookieSerializer cookieSerializer(FoundationProperties properties) {
        var cookie=new DefaultCookieSerializer(); cookie.setCookieName("HSAAS_SESSION"); cookie.setCookiePath("/");
        cookie.setUseHttpOnlyCookie(true); cookie.setUseSecureCookie(properties.secureCookie()); cookie.setSameSite("Lax");
        return cookie;
    }
}
