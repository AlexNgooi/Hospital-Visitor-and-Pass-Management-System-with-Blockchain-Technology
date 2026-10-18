package eduupm.hsaas.assignment;

import java.time.*;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import eduupm.hsaas.auth.*;
import eduupm.hsaas.common.*;
import eduupm.hsaas.config.*;
import eduupm.hsaas.reader.SyntheticReader;
import eduupm.hsaas.registration.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Necessary narrow SQL checks only: owned MySQL, real Flyway/JPA transaction manager, no servlet/business service startup. */
@Testcontainers
class LifecycleMysqlTests {
    @Container static final MySQLContainer MYSQL=new MySQLContainer("mysql:8.0.45").withCommand("--log-bin-trust-function-creators=1");
    static JdbcTemplate jdbc;
    static JpaTransactionManager manager;
    static LocalContainerEntityManagerFactoryBean factory;
    static final Instant NOW=Instant.parse("2026-10-18T06:00:00Z");
    long actor,counter,category,registration,otherRegistration;
    String owner,binding,card,otherCard;

    /** Applies V1-V5 first, then the current migration directory, also allowing coordinator's later V7 integration check. */
    @BeforeAll static void database() {
        var source=new DriverManagerDataSource(MYSQL.getJdbcUrl(),MYSQL.getUsername(),MYSQL.getPassword());
        Flyway.configure().dataSource(source).target("5").locations("classpath:db/migration").load().migrate();
        Flyway.configure().dataSource(source).locations("classpath:db/migration").load().migrate();
        jdbc=new JdbcTemplate(source);
        factory=new LocalContainerEntityManagerFactoryBean(); factory.setDataSource(source);
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter()); factory.setPackagesToScan("eduupm.hsaas.assignment");
        factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto","none","hibernate.connection.handling_mode","DELAYED_ACQUISITION_AND_HOLD"));
        factory.afterPropertiesSet(); manager=new JpaTransactionManager(Objects.requireNonNull(factory.getObject())); manager.setDataSource(source); manager.afterPropertiesSet();
    }
    @AfterAll static void close() { if(factory!=null) factory.destroy(); }

    /** Each case uses independent synthetic parents; no cleanup, migration or repair can touch a native database. */
    @BeforeEach void fixture() {
        String suffix=UUID.randomUUID().toString().substring(0,8);
        jdbc.update("INSERT INTO users(login,password_hash,role,created_at,updated_at) VALUES(?,'not-a-real-password','ADMIN',?,?)","m05_"+suffix,DatabaseTime.sql(NOW),DatabaseTime.sql(NOW));
        actor=jdbc.queryForObject("SELECT id FROM users WHERE login=?",Long.class,"m05_"+suffix);
        jdbc.update("INSERT INTO counters(code,name) VALUES(?,'Synthetic SQL fixture')","M05_"+suffix);
        counter=jdbc.queryForObject("SELECT id FROM counters WHERE code=?",Long.class,"M05_"+suffix);
        jdbc.update("INSERT IGNORE INTO visitor_categories(code,name) VALUES('VENDOR','Synthetic Vendor')");
        category=jdbc.queryForObject("SELECT id FROM visitor_categories WHERE code='VENDOR'",Long.class);
        jdbc.update("INSERT IGNORE INTO destinations(code,name) VALUES('M05_DEMO','Synthetic destination')");
        binding=UUID.randomUUID().toString(); owner=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO app_session_bindings(id,spring_primary_id,anonymous_scope_id,anonymous_created_at,anonymous_expires_at) VALUES(?,?,?,?,?)",
                binding,UUID.randomUUID().toString(),UUID.randomUUID().toString(),DatabaseTime.sql(NOW),DatabaseTime.sql(NOW.plusSeconds(3600)));
        jdbc.update("INSERT INTO auth_session_contexts(id,binding_id,actor_id,captured_security_epoch,generation,authenticated_at,absolute_expires_at,activation_expires_at,confirmed_idle_expires_at,state) VALUES(?,?,?,0,1,?,?,?,?,'ACTIVE')",
                owner,binding,actor,DatabaseTime.sql(NOW),DatabaseTime.sql(NOW.plusSeconds(3600)),DatabaseTime.sql(NOW.plusSeconds(60)),DatabaseTime.sql(NOW.plusSeconds(1800)));
        registration=registration(); otherRegistration=registration(); card=card("A"); otherCard=card("B");
    }
    private long registration() {
        String display=UUID.randomUUID().toString(),challenge=UUID.randomUUID().toString(),grant=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO registration_qr_sessions(id,actor_id,owner_context_id,counter_id,environment,created_at) VALUES(?,?,?,?,'test',?)",display,actor,owner,counter,DatabaseTime.sql(NOW));
        jdbc.update("INSERT INTO registration_qr_challenges(id,display_session_id,rotation_slot,nonce,token_version,key_version,issued_at,rotate_at,expires_at) VALUES(?,?,1,?,1,'fixture',?,?,?)",challenge,display,"X".repeat(43),DatabaseTime.sql(NOW),DatabaseTime.sql(NOW.plusSeconds(30)),DatabaseTime.sql(NOW.plusSeconds(60)));
        jdbc.update("INSERT INTO registration_entry_grants(id,grant_reference,binding_version,anonymous_session_binding,anonymous_scope_id,challenge_id,display_session_id,counter_id,environment,issued_at,expires_at) VALUES(?,?,1,?,?,?,?,?,'test',?,?)",
                grant,UUID.randomUUID().toString(),binding,UUID.randomUUID().toString(),challenge,display,counter,DatabaseTime.sql(NOW),DatabaseTime.sql(NOW.plusSeconds(1200)));
        String reference="R-"+UUID.randomUUID().toString();
        jdbc.update("INSERT INTO visitor_registrations(public_reference,entry_grant_id,anonymous_scope_id,counter_id,category_id,category_code,destination_id,field_schema_version,form_data,environment,data_origin,status,submitted_at) VALUES(?,?,?,?,?,'VENDOR',(SELECT id FROM destinations WHERE code='M05_DEMO'),'synthetic-registration-v1','{}','test','SYNTHETIC','VERIFIED',?)",
                reference,grant,UUID.randomUUID().toString(),counter,category,DatabaseTime.sql(NOW));
        return jdbc.queryForObject("SELECT id FROM visitor_registrations WHERE public_reference=?",Long.class,reference);
    }
    private String card(String suffix) {
        String id=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO cards(id,normalized_uid,card_code,category_id,category_code,profile_code,status,enrolled_by,enrolled_at,data_origin,environment) VALUES(?,?,?,?,'VENDOR','SYNTHETIC_VENDOR_V1','AVAILABLE',?,?,'SIMULATED','test')",
                id,"FIXTURE"+id.replace("-","").substring(0,20)+suffix,"C-"+id,category,actor,DatabaseTime.sql(NOW));
        return id;
    }
    private String assignment(String cardId,long registrationId) {
        String id=UUID.randomUUID().toString();
        jdbc.update("INSERT INTO card_assignments(id,pass_reference,card_id,registration_id,issue_counter_id,return_counter_id,issued_by,issued_at,due_at,return_rule_key,return_rule_version,handover_confirmed_at,operation_origin,environment) VALUES(?,?,?,?,?,?,?,?,?,'return_hours_VENDOR',0,?,'SIMULATED','test')",
                id,"P-DEMO-"+id.replace("-",""),cardId,registrationId,counter,counter,actor,DatabaseTime.sql(NOW),DatabaseTime.sql(NOW.plusSeconds(86400)),DatabaseTime.sql(NOW));
        return id;
    }

    /** Actual MySQL checks NULL closure rejection and both generated unique indexes, then permits a later closed-loan reuse. */
    @Test void migrationAndActiveUniquenessAndClosureChecks() {
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM flyway_schema_history WHERE version='6' AND success=TRUE",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT value_int FROM system_settings WHERE setting_key='return_hours_VENDOR'",Integer.class)).isEqualTo(24);
        String first=assignment(card,registration);
        assertThatThrownBy(()->assignment(card,otherRegistration)).isInstanceOf(DataAccessException.class);
        assertThatThrownBy(()->assignment(otherCard,registration)).isInstanceOf(DataAccessException.class);
        assertThatThrownBy(()->jdbc.update("UPDATE card_assignments SET closed_at=?,closure_reason=NULL WHERE id=?",DatabaseTime.sql(NOW.plusSeconds(1)),first)).isInstanceOf(DataAccessException.class);
        jdbc.update("UPDATE card_assignments SET closed_at=?,returned_at=?,returned_by=?,closure_reason='RETURNED' WHERE id=?",DatabaseTime.sql(NOW.plusSeconds(1)),DatabaseTime.sql(NOW.plusSeconds(1)),actor,first);
        assertThat(assignment(card,registration)).isNotEqualTo(first);
    }

    /** A forced local-audit failure rolls back real enrollment, evidence consumption, lifecycle event and idempotency together. */
    @Test void enrollmentAuditFailureRollsBackAndExpiredSuccessReplayDoesNotConsumeTwice() {
        var properties=new FoundationProperties("test","mock","manual","disabled","disabled",false,Duration.ofMinutes(30),Duration.ofHours(8),Duration.ofHours(24),Duration.ofMinutes(1),"fixture",Base64.getEncoder().encodeToString(new byte[32]),Map.of());
        var json=new FoundationConfig().jsonMapper(); var clock=Clock.fixed(NOW,ZoneOffset.UTC);
        var accounts=mock(Accounts.class); var capabilities=mock(SessionCapabilities.class);
        var account=new Accounts.Account(actor,"synthetic_admin","redacted","ADMIN",true,0);
        when(accounts.lock(actor)).thenReturn(account); when(capabilities.requireHuman(anyString(),anyString(),anyLong(),anyString())).thenReturn(account);
        var service=new LifecycleService(new LifecycleStore(jdbc),accounts,capabilities,mock(RegistrationLifecyclePort.class),mock(RegistrationReviewPort.class),new SyntheticReader(),
                new IdempotencyPort(jdbc,json,clock,properties),new LocalAuditPort(jdbc,json,clock),json,clock,properties,manager);
        String device=UUID.randomUUID().toString(),job=UUID.randomUUID().toString(),result=UUID.randomUUID().toString();
        var reading=new SyntheticReader().read("DEMO-VENDOR-001");
        jdbc.update("INSERT INTO reader_devices(id,counter_id,data_origin,environment) VALUES(?,?,'SIMULATED','test')",device,counter);
        jdbc.update("INSERT INTO scan_jobs(id,device_id,actor_id,owner_context_id,counter_id,purpose,target_ref,nonce_digest,lease_digest,capability_key_version,expires_at,status,created_at,environment) VALUES(?,?,?,?,?,'ENROLL','REGISTER',?,?,'fixture',?,'SUCCEEDED',?,'test')",
                job,device,actor,owner,counter,new byte[32],new byte[32],DatabaseTime.sql(NOW.plusSeconds(60)),DatabaseTime.sql(NOW.minusSeconds(60)));
        jdbc.update("UPDATE reader_devices SET active_scan_job_id=? WHERE id=?",job,device);
        jdbc.update("INSERT INTO scan_results(id,job_id,normalized_uid,profile_code,category_code,sample_code,data_origin,environment,accepted_at) VALUES(?,?,?,?,'VENDOR',?,'SIMULATED','test',?)",
                result,job,reading.normalizedUid(),reading.profileCode(),reading.sampleCode(),DatabaseTime.sql(NOW));
        var context=new LifecycleSecurity.Context(binding,owner,1L,"synthetic_admin"); String key=UUID.randomUUID().toString(),body="{\"scanResultId\":\""+result+"\"}";
        jdbc.execute("CREATE TRIGGER m05_forced_audit_failure BEFORE INSERT ON audit_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'");
        try { assertThatThrownBy(()->service.command(context,true,"CARD_ENROLL","REGISTER",key,body)).isInstanceOf(DataAccessException.class); }
        finally { jdbc.execute("DROP TRIGGER m05_forced_audit_failure"); }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM cards WHERE normalized_uid=?",Integer.class,reading.normalizedUid())).isZero();
        assertThat(jdbc.queryForObject("SELECT status FROM scan_jobs WHERE id=?",String.class,job)).isEqualTo("SUCCEEDED");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_records WHERE command_key=?",Integer.class,key)).isZero();
        assertThat(jdbc.queryForObject("SELECT active_scan_job_id FROM reader_devices WHERE id=?",String.class,device)).isEqualTo(job);
        var successful=service.command(context,true,"CARD_ENROLL","REGISTER",key,body);
        jdbc.update("UPDATE scan_jobs SET expires_at=? WHERE id=?",DatabaseTime.sql(NOW.minusSeconds(1)),job);
        assertThat(service.command(context,true,"CARD_ENROLL","REGISTER",key,body)).isEqualTo(successful);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM lifecycle_events WHERE card_id=?",Integer.class,successful.id())).isEqualTo(1);
        // Current authority still wins over a stored successful result.
        when(capabilities.requireHuman(anyString(),anyString(),anyLong(),anyString())).thenThrow(ApiFailure.unauthenticated());
        assertThatThrownBy(()->service.command(context,true,"CARD_ENROLL","REGISTER",key,body)).isInstanceOf(ApiFailure.class);
    }
}
