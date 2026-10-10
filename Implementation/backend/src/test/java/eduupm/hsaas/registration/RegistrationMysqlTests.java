package eduupm.hsaas.registration;

import eduupm.hsaas.registrationentry.QrEntryService;

import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.TransactionDefinition;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.common.*;
import eduupm.hsaas.common.RestartDetails.FormContext;
import eduupm.hsaas.auth.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Synthetic registration servlet and lock graph runs exclusively on an owned temporary MySQL, never a developer database. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class RegistrationMysqlTests {
    @Container static final MySQLContainer MYSQL=new MySQLContainer("mysql:8.0.45").withCommand("--log-bin-trust-function-creators=1");
    @LocalServerPort int port;
    @MockitoSpyBean JdbcTemplate jdbc;
    @Autowired JsonMapper json;
    @Autowired PasswordEncoder passwords;
    @Autowired QrEntryService entries;
    @Autowired TransactionTemplate tx;
    @Autowired SessionCapabilities capabilities;
    @Autowired AccountChanges changes;
    @Autowired IdempotencyPort commands;
    @Autowired LocalAuditPort audit;
    @Autowired LoginLimiter loginLimiter;
    @Autowired RegistrationService registrations;
    @Autowired RegistrationStore store;
    @Autowired RegistrationController controller;
    @MockitoSpyBean Clock clock;
    private Instant now;
    private long staffId,adminId;
    private static final String PASSWORD="Public-synthetic-fixture_1";

    /** Every setting is explicit and secret material is public fixture data, not a file or inherited native URL. */
    @DynamicPropertySource static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url",MYSQL::getJdbcUrl);properties.add("spring.datasource.username",MYSQL::getUsername);properties.add("spring.datasource.password",MYSQL::getPassword);
        properties.add("hsaas.registration.enabled",()->"true");properties.add("hsaas.mrn-mode",()->"mock");
        properties.add("hsaas.qr.enabled",()->"true");properties.add("hsaas.qr.origin",()->"https://entry.example.test");
        properties.add("hsaas.qr.active-key",()->"fixture");properties.add("hsaas.qr.keys.fixture",()->Base64.getEncoder().encodeToString(new byte[32]));
        properties.add("hsaas.hash-key-version",()->"fixture");properties.add("hsaas.hash-key",()->Base64.getEncoder().encodeToString(new byte[32]));
    }
    /** Only disposable fixtures are removed; circular domain pointers are cleared before their referenced rows. */
    @BeforeEach void fixtures() {
        reset(clock);now=Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);doReturn(now).when(clock).instant();
        ((Map<?,?>)org.springframework.test.util.ReflectionTestUtils.getField(loginLimiter,"buckets")).clear();
        ((Map<?,?>)org.springframework.test.util.ReflectionTestUtils.getField(controller,"buckets")).clear();
        jdbc.execute("DROP TRIGGER IF EXISTS registration_audit_failure");
        jdbc.update("DELETE FROM registration_entry_contexts");
        // V5 uses a real circular parent FK; clear its paired consumption pointer before owned fixture deletion.
        jdbc.update("UPDATE registration_entry_grants SET registration_id=NULL,consumed_at=NULL");
        for(String table:List.of("mrn_validation_records","registration_consents","visitor_registrations")) { jdbc.update("DELETE FROM "+table); }
        jdbc.update("UPDATE registration_entry_grants SET replaces_grant_id=NULL,replaces_binding_version=NULL");
        for(String table:List.of("registration_entry_grants","registration_qr_challenges","registration_qr_sessions")) { jdbc.update("DELETE FROM "+table); }
        jdbc.update("UPDATE app_session_bindings SET current_owner_context_id=NULL");
        for(String table:List.of("auth_session_contexts","app_session_bindings","SPRING_SESSION_ATTRIBUTES","SPRING_SESSION","idempotency_records","audit_events","user_counter_permissions","users","counters","destinations","visitor_categories")) { jdbc.update("DELETE FROM "+table); }
        String password=passwords.encode(PASSWORD);
        for(String role:List.of("COUNTER_STAFF","ADMIN")) {
            jdbc.update("INSERT INTO users(login,password_hash,role,active,created_at,updated_at) VALUES(?,?,?,TRUE,?,?)",role.equals("ADMIN")?"admin_qr":"staff_qr",password,role,DatabaseTime.sql(now),DatabaseTime.sql(now));
        }
        staffId=jdbc.queryForObject("SELECT id FROM users WHERE login='staff_qr'",Long.class);adminId=jdbc.queryForObject("SELECT id FROM users WHERE login='admin_qr'",Long.class);
        jdbc.update("INSERT INTO counters(id,code,name) VALUES(1,'QR_SYNTHETIC_1','Synthetic counter one'),(2,'QR_SYNTHETIC_2','Synthetic counter two')");
        jdbc.update("INSERT INTO user_counter_permissions(user_id,counter_id) VALUES(?,1),(?,2)",staffId,staffId);
        jdbc.update("INSERT INTO visitor_categories(id,code,name) VALUES(1,'PENJAGA','Synthetic Penjaga'),(2,'VENDOR','Synthetic Vendor'),(3,'EXECUTIVE','Synthetic Executive'),(4,'CONTRACTOR','Synthetic Contractor')");
        jdbc.update("INSERT INTO destinations(id,code,name) VALUES(1,'DEMO_WARD','Synthetic ward'),(2,'DEMO_OFFICE','Synthetic office'),(3,'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA','Unselectable long code')");
    }

    /** Four real servlet submissions persist one independent synthetic root/ack/grant/audit/command each, exposing only a reference. */
    @Test void fourCategoriesValidPrivacyAndMinimalReceipt() throws Exception {
        for(String category:List.of("PENJAGA","EXECUTIVE","VENDOR","CONTRACTOR")) {
            Visitor visitor=visitor("1",null);String body=body(visitor,category);
            var response=visitor.browser().submit(body,UUID.randomUUID().toString(),true);
            assertThat(response.statusCode()).isEqualTo(201);
            var result=json.readTree(response.body());
            assertThat(result.size()).isEqualTo(1);
            assertThat(result.path("publicReference").asString()).matches("R-[A-Za-z0-9_-]{22}");
            assertThat(response.headers().firstValue("cache-control")).contains("no-store");
            assertThat(visitor.browser().get("/api/public/registration-entry").statusCode()).isEqualTo(403);
        }
        for(String table:List.of("visitor_registrations","registration_consents","idempotency_records")) {
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class)).isEqualTo(4);
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registration_entry_grants WHERE consumed_at IS NOT NULL AND registration_id IS NOT NULL",Integer.class)).isEqualTo(4);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM audit_events WHERE action='REGISTRATION_SUBMITTED'",Integer.class)).isEqualTo(4);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM visitor_registrations WHERE data_origin='SYNTHETIC' AND status='SUBMITTED' AND reviewer_id IS NULL",Integer.class)).isEqualTo(4);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registration_consents WHERE purpose!='PRIVACY_ACK'",Integer.class)).isZero();
    }

    /** Bootstrap, staff identity, missing CSRF and another anonymous binding cannot authorize schema or root mutation. */
    @Test void schemaScopeCsrfAndInvalidBodiesRemainUnconsumed() throws Exception {
        Visitor visitor=visitor("1","1");
        var response=visitor.browser().post("/api/public/registration-schema",Map.of("formContext",visitor.entry().formContext()),true);
        assertThat(response.statusCode()).isEqualTo(200);
        var schema=json.readTree(response.body());
        assertThat(schema.path("categories").size()).isEqualTo(1);
        assertThat(schema.path("categories").get(0).path("code").asString()).isEqualTo("PENJAGA");
        assertThat(schema.path("destinations").size()).isEqualTo(2);
        Browser other=new Browser();other.csrf();
        assertThat(other.post("/api/public/registration-schema",Map.of("formContext",visitor.entry().formContext()),true).statusCode()).isEqualTo(403);
        String valid=body(visitor,"PENJAGA");
        assertThat(visitor.browser().submit(valid,UUID.randomUUID().toString(),false).statusCode()).isEqualTo(403);
        assertThat(visitor.browser().submit(valid,null,true).statusCode()).isEqualTo(400);
        for(String invalid:List.of(valid.replace("\"acknowledged\":true","\"acknowledged\":false"),
                valid.replace("DEMO-VISITOR01","REAL-123456789"),
                valid.replace("\"relationship\":\"PARENT\"","\"relationship\":\"PARENT\",\"whatsappOptIn\":true"),
                valid.replace("synthetic-registration-v1","obsolete-schema"),
                body(visitor,"VENDOR"))) {
            assertThat(visitor.browser().submit(invalid,UUID.randomUUID().toString(),true).statusCode()).isIn(400,409);
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM visitor_registrations",Integer.class)).isZero();
        assertThat(entries.entry(visitor.browser().binding()).formContext()).isEqualTo(visitor.entry().formContext());
    }

    /** A consumed/expired/revoked grant may recover its original command only while its anonymous framework authority remains valid. */
    @Test void originalReplayChangedBodyAndOtherKey() throws Exception {
        Visitor visitor=visitor("1",null);String body=body(visitor,"VENDOR").replace("Demo Visitor","a\u0306\u0301".repeat(100)),key=UUID.randomUUID().toString();
        var first=visitor.browser().submit(body,key,true);assertThat(first.statusCode()).isEqualTo(201);
        entries.revoke(visitor.staff().owner(),visitor.display());advance(1201);
        var replay=visitor.browser().submit(body,key,true);
        assertThat(replay.statusCode()).isEqualTo(201);assertThat(replay.body()).isEqualTo(first.body());
        // Equal persisted NFC names remain different original commands, even after success and grant expiration.
        assertThat(visitor.browser().submit(body.replace("a\u0306\u0301".repeat(100),"ắ".repeat(100)),key,true).statusCode()).isEqualTo(409);
        assertThat(visitor.browser().submit(body,UUID.randomUUID().toString(),true).statusCode()).isEqualTo(409);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM visitor_registrations",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registration_consents",Integer.class)).isEqualTo(1);
        jdbc.update("UPDATE SPRING_SESSION SET LAST_ACCESS_TIME=1 WHERE SESSION_ID=?",visitor.browser().sessionId());
        assertThat(visitor.browser().submit(body,key,true).statusCode()).isIn(401,403);
    }

    /** Competing exact commands recover one winner; a second key cannot create another parent for the consumed grant. */
    @Test void concurrentExactCommandsAndDifferentKeys() throws Exception {
        Visitor visitor=visitor("1",null);String body=body(visitor,"CONTRACTOR"),key=UUID.randomUUID().toString(),binding=visitor.browser().binding();
        var results=race(()->registrations.submit(binding,key,body),()->registrations.submit(binding,key,body));
        assertThat(results).allMatch(RegistrationService.Receipt.class::isInstance);
        assertThat(((RegistrationService.Receipt)results.get(0)).publicReference()).isEqualTo(((RegistrationService.Receipt)results.get(1)).publicReference());
        Visitor second=visitor("1",null);String secondBody=body(second,"EXECUTIVE"),secondBinding=second.browser().binding();
        var competing=race(()->registrations.submit(secondBinding,UUID.randomUUID().toString(),secondBody),
                ()->registrations.submit(secondBinding,UUID.randomUUID().toString(),secondBody));
        assertThat(competing.stream().filter(RegistrationService.Receipt.class::isInstance).count()).isEqualTo(1);
        assertThat(competing.stream().filter(ApiFailure.class::isInstance).count()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM visitor_registrations",Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM registration_consents",Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM idempotency_records",Integer.class)).isEqualTo(2);
    }

    /** A late audit failure rolls back parent, acknowledgement, consumption and idempotency; retry remains one original command. */
    @Test void auditFailureFullRollbackAndRealForeignKey() throws Exception {
        Visitor visitor=visitor("1",null);String body=body(visitor,"PENJAGA"),key=UUID.randomUUID().toString();
        jdbc.execute("CREATE TRIGGER registration_audit_failure BEFORE INSERT ON audit_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic audit failure'");
        // The shared foundation safely maps a database write failure to SERVICE_UNAVAILABLE.
        assertThat(visitor.browser().submit(body,key,true).statusCode()).isEqualTo(503);
        for(String table:List.of("visitor_registrations","registration_consents","idempotency_records")) {
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM "+table,Integer.class)).isZero();
        }
        assertThat(entries.entry(visitor.browser().binding()).formContext()).isEqualTo(visitor.entry().formContext());
        jdbc.execute("DROP TRIGGER registration_audit_failure");
        assertThat(visitor.browser().submit(body,key,true).statusCode()).isEqualTo(201);
        assertThatThrownBy(()->jdbc.update("UPDATE registration_entry_grants SET registration_id=999999 WHERE consumed_at IS NOT NULL"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    /** Mock feedback has no patient data and never verifies a registration; only its digest and contextual keyed fingerprint persist. */
    @Test void mrnBoundFeedbackDigestAndManualDeferral() throws Exception {
        Visitor visitor=visitor("1",null);
        var feedback=registrations.validateMrn(visitor.browser().binding(),json.writeValueAsString(Map.of("formContext",visitor.entry().formContext(),"mrn","DEMO-MRN-4821","wardCode","DEMO_WARD")));
        assertThat(feedback.feedback()).isEqualTo("MATCH");assertThat(feedback.toString()).isEqualTo("FeedbackReply[redacted]");
        assertThat(Instant.parse(feedback.expiresAt())).isEqualTo(now.plusSeconds(300));
        assertThat(jdbc.queryForObject("SELECT OCTET_LENGTH(token_digest) FROM mrn_validation_records",Integer.class)).isEqualTo(32);
        assertThat(jdbc.queryForObject("SELECT OCTET_LENGTH(mrn_fingerprint) FROM mrn_validation_records",Integer.class)).isEqualTo(32);
        String base=body(visitor,"PENJAGA"),withToken=base.substring(0,base.length()-1)+",\"mrnValidationToken\":\""+feedback.validationToken()+"\"}";
        assertThat(visitor.browser().submit(withToken.replace("DEMO-MRN-4821","DEMO-MRN-9999"),UUID.randomUUID().toString(),true).statusCode()).isEqualTo(409);
        Visitor other=visitor("1",null);
        String otherBody=body(other,"PENJAGA");otherBody=otherBody.substring(0,otherBody.length()-1)+",\"mrnValidationToken\":\""+feedback.validationToken()+"\"}";
        assertThat(other.browser().submit(otherBody,UUID.randomUUID().toString(),true).statusCode()).isEqualTo(409);
        assertThat(visitor.browser().submit(withToken,UUID.randomUUID().toString(),true).statusCode()).isEqualTo(201);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM visitor_registrations WHERE mrn_feedback='MATCH' AND mrn_verified=FALSE AND ward_verified=FALSE AND status='SUBMITTED'",Integer.class)).isEqualTo(1);
        assertThat(other.browser().submit(body(other,"PENJAGA"),UUID.randomUUID().toString(),true).statusCode()).isEqualTo(201);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM visitor_registrations WHERE mrn_feedback='NOT_CHECKED'",Integer.class)).isEqualTo(1);
    }

    /** Expired temporary feedback can be discarded for manual review; bounded cleanup never removes permanent history. */
    @Test void mrnTimeoutExpiryAndCleanup() throws Exception {
        Visitor visitor=visitor("1",null);
        var feedback=registrations.validateMrn(visitor.browser().binding(),json.writeValueAsString(Map.of("formContext",visitor.entry().formContext(),"mrn","DEMO-MRN-TIMEOUT","wardCode","DEMO_WARD")));
        assertThat(feedback.feedback()).isEqualTo("TIMEOUT");
        advance(300);String base=body(visitor,"PENJAGA").replace("DEMO-MRN-4821","DEMO-MRN-TIMEOUT");
        String tokenBody=base.substring(0,base.length()-1)+",\"mrnValidationToken\":\""+feedback.validationToken()+"\"}";
        assertThat(visitor.browser().submit(tokenBody,UUID.randomUUID().toString(),true).statusCode()).isEqualTo(409);
        assertThat(registrations.cleanupFeedback()).isEqualTo(1);
        assertThat(visitor.browser().submit(base,UUID.randomUUID().toString(),true).statusCode()).isEqualTo(201);
        assertThat(registrations.cleanupFeedback()).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM visitor_registrations",Integer.class)).isEqualTo(1);
    }

    /** Suspended/stale grant and root/read receipts must fail before any JDBC interaction; outer resumption retains authority. */
    @Test void actualReceiptFencesBeforeSqlAndResume() throws Exception {
        Visitor visitor=visitor("1",null);String binding=visitor.browser().binding(),owner=visitor.staff().owner();
        var inner=new TransactionTemplate(Objects.requireNonNull(tx.getTransactionManager()));
        inner.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        inner.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        tx.executeWithoutResult(outer->{
            var access=entries.lockGrant(binding,visitor.entry().formContext());
            inner.executeWithoutResult(unused->{
                clearInvocations(jdbc);
                assertThatThrownBy(()->store.create(access,"unused",null,null,Map.of(),null,null)).isInstanceOf(IllegalStateException.class);
                verifyNoInteractions(jdbc);
            });
            var category=store.category("VENDOR",null);var destination=store.destination("DEMO_OFFICE","destinationCode");
            long id=store.create(access,entriesScope(binding),category,destination,form("VENDOR"),"mock",null);
            store.acknowledge(id);entries.consume(access,id);
        });
        String id=rootId();
        tx.executeWithoutResult(outer->{
            var read=store.captureReadScope(owner,"1");
            var locked=store.lock(store.discover(id));
            inner.executeWithoutResult(unused->{
                clearInvocations(jdbc);
                assertThatThrownBy(()->store.readMaskedDetail(read,id)).isInstanceOf(IllegalStateException.class);
                assertThatThrownBy(()->store.recordDecision(locked,0,owner,new RegistrationReviewPort.Rejected("INFORMATION_INCOMPLETE"))).isInstanceOf(IllegalStateException.class);
                verifyNoInteractions(jdbc);
            });
            assertThat(store.readMaskedDetail(read,id).status()).isEqualTo("SUBMITTED");
            assertThat(store.recordDecision(locked,0,owner,new RegistrationReviewPort.Rejected("INFORMATION_INCOMPLETE")).status()).isEqualTo("REJECTED");
            clearInvocations(jdbc);
            assertThatThrownBy(()->store.readMaskedDetail(read,id)).isInstanceOf(IllegalStateException.class);
            assertThatThrownBy(()->store.recordDecision(locked,1,owner,new RegistrationReviewPort.Rejected("INFORMATION_INCOMPLETE"))).isInstanceOf(IllegalStateException.class);
            verifyNoInteractions(jdbc);
        });
        assertThatThrownBy(()->store.captureReadScope(owner,"1")).isInstanceOf(IllegalStateException.class);
    }

    /** Current single-counter authority guards masked historical reads and server review metadata, including inactive locations. */
    @Test void maskedQueueDetailRoleCounterAndManualDecision() throws Exception {
        Visitor visitor=visitor("1",null);assertThat(visitor.browser().submit(body(visitor,"PENJAGA"),UUID.randomUUID().toString(),true).statusCode()).isEqualTo(201);
        String id=rootId(),owner=visitor.staff().owner();
        jdbc.update("UPDATE destinations SET active=FALSE WHERE id=1");
        var queue=tx.execute(status->store.readMaskedQueue(store.captureReadScope(owner,"1"),new RegistrationReadPort.ReadQuery(null,null,0,10)));
        assertThat(queue.total()).isEqualTo(1);assertThat(queue.items().getFirst().destinationLabel()).isEqualTo("Synthetic ward");
        var detail=tx.execute(status->store.readMaskedDetail(store.captureReadScope(owner,"1"),id));
        String wire=json.writeValueAsString(detail);
        assertThat(wire).doesNotContain("Demo Visitor","DEMO-VISITOR01","+60123456789","DEMO-MRN-4821","formData");
        assertThat(detail.maskedVisitorName()).isEqualTo("D***");assertThat(detail.review()).isNull();
        assertThatThrownBy(()->tx.execute(status->store.readMaskedDetail(store.captureReadScope(owner,"2"),id))).isInstanceOfSatisfying(ApiFailure.class,f->assertThat(f.status()).isEqualTo(404));
        Browser admin=new Browser();admin.login("admin_qr");String adminOwner=admin.owner();
        assertThatThrownBy(()->tx.execute(status->store.captureReadScope(adminOwner,"1"))).isInstanceOfSatisfying(ApiFailure.class,f->assertThat(f.status()).isEqualTo(403));
        var verified=new RegistrationReviewPort.Verified(true,true,true,new ManualEvidence("SYNTHETIC_RECORD_COMPARISON",List.of("IDENTITY_MATCH_CONFIRMED","MRN_MATCH_CONFIRMED","WARD_MATCH_CONFIRMED")));
        tx.executeWithoutResult(status->{
            capabilities.lockOwners(List.of(new SessionCapabilities.OwnerUse(owner,1)),null);
            var result=store.recordDecision(store.lock(store.discover(id)),0,owner,verified);
            assertThat(result.status()).isEqualTo("VERIFIED");assertThat(result.version()).isEqualTo(1);
        });
        var reviewed=tx.execute(status->store.readMaskedDetail(store.captureReadScope(owner,"1"),id));
        assertThat(reviewed.review().actorId()).isEqualTo(Long.toString(staffId));
        assertThat(reviewed.review().source()).isEqualTo("SYNTHETIC_MANUAL");
        assertThatThrownBy(()->tx.execute(status->{capabilities.lockOwners(List.of(new SessionCapabilities.OwnerUse(owner,1)),null);return store.recordDecision(store.lock(store.discover(id)),1,owner,verified);}))
                .isInstanceOfSatisfying(ApiFailure.class,f->assertThat(f.code()).isEqualTo("REGISTRATION_STATE_CONFLICT"));
        jdbc.update("UPDATE user_counter_permissions SET active=FALSE WHERE user_id=? AND counter_id=1",staffId);
        assertThatThrownBy(()->tx.execute(status->store.captureReadScope(owner,"1"))).isInstanceOfSatisfying(ApiFailure.class,f->assertThat(f.status()).isEqualTo(404));
        // Internal authority reads persisted EXPIRY_TIME, not the framework's last-access convenience timestamp.
        jdbc.update("UPDATE SPRING_SESSION SET LAST_ACCESS_TIME=1,EXPIRY_TIME=1 WHERE SESSION_ID=?",visitor.staff().sessionId());
        assertThatThrownBy(()->tx.execute(status->store.captureReadScope(owner,"2"))).isInstanceOfSatisfying(ApiFailure.class,f->assertThat(f.status()).isEqualTo(401));
    }

    /** Active reference sharing serializes with deactivation without adding a reference-to-grant reverse lock path. */
    @Test void referenceDeactivationSerializesWithNewSubmission() throws Exception {
        Visitor visitor=visitor("1",null);String binding=visitor.browser().binding(),body=body(visitor,"EXECUTIVE");
        var results=race(()->registrations.submit(binding,UUID.randomUUID().toString(),body),
                ()->tx.execute(status->jdbc.update("UPDATE destinations SET active=FALSE WHERE id=2")));
        assertThat(results.get(1)).isInstanceOf(Integer.class);
        assertThat(results.get(0)).isInstanceOfAny(RegistrationService.Receipt.class,ApiFailure.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM visitor_registrations",Integer.class))
                .isEqualTo(results.get(0) instanceof RegistrationService.Receipt?1:0);
        Visitor later=visitor("1",null);
        assertThat(later.browser().submit(body(later,"EXECUTIVE"),UUID.randomUUID().toString(),true).statusCode()).isEqualTo(400);
        jdbc.update("UPDATE visitor_categories SET active=FALSE WHERE code='PENJAGA'");
        assertThat(later.browser().submit(body(later,"PENJAGA"),UUID.randomUUID().toString(),true).statusCode()).isEqualTo(400);
    }

    /** Public operations on a staff-owned cookie cannot extend the human owner's confirmed idle deadline. */
    @Test void publicOperationsDoNotRenewStaffOwner() throws Exception {
        Browser staff=staff();String display=staff.create("1",null);
        var exchanged=staff.exchange(token(staff.get("/api/staff/registration-qr-sessions/"+display+"/current")));
        var entry=json.readValue(exchanged.body(),QrEntryService.Entry.class);String owner=staff.owner();
        LocalDateTime before=jdbc.queryForObject("SELECT confirmed_idle_expires_at FROM auth_session_contexts WHERE id=?",LocalDateTime.class,owner);
        Visitor visitor=new Visitor(staff,entry,staff,display);
        assertThat(staff.post("/api/public/registration-schema",Map.of("formContext",entry.formContext()),true).statusCode()).isEqualTo(200);
        assertThat(staff.post("/api/public/mrn-validations",Map.of("formContext",entry.formContext(),"mrn","DEMO-MRN-4821","wardCode","DEMO_WARD"),true).statusCode()).isEqualTo(200);
        assertThat(staff.submit(body(visitor,"PENJAGA"),UUID.randomUUID().toString(),true).statusCode()).isEqualTo(201);
        assertThat(jdbc.queryForObject("SELECT confirmed_idle_expires_at FROM auth_session_contexts WHERE id=?",LocalDateTime.class,owner)).isEqualTo(before);
    }

    /** Test fixtures describe valid demo input only; field parsing and persistence remain production service responsibilities. */
    private Map<String,String> form(String category) {
        var form=new LinkedHashMap<String,String>();form.put("fullName","Demo Visitor");form.put("identificationType","TEST_ID");form.put("identificationNumber","DEMO-VISITOR01");form.put("phone","+60123456789");
        switch(category) {
            case "PENJAGA" -> {form.put("mrn","DEMO-MRN-4821");form.put("wardCode","DEMO_WARD");form.put("relationship","PARENT");}
            case "EXECUTIVE" -> {form.put("organisation","Demo Organisation");form.put("contactPerson","Demo Contact");form.put("destinationCode","DEMO_OFFICE");form.put("visitPurpose","Demo visit");}
            case "VENDOR" -> {form.put("company","Demo Company");form.put("contactPerson","Demo Contact");form.put("destinationCode","DEMO_OFFICE");form.put("deliveryPurpose","Demo delivery");}
            case "CONTRACTOR" -> {form.put("company","Demo Company");form.put("contactPerson","Demo Contact");form.put("destinationCode","DEMO_OFFICE");form.put("workPurpose","Demo maintenance");}
            default -> throw new IllegalArgumentException("Invalid fixture category");
        }
        return form;
    }
    private String body(Visitor visitor,String category) {
        return json.writeValueAsString(Map.of("formContext",visitor.entry().formContext(),"categoryCode",category,"fieldSchemaVersion",RegistrationFields.VERSION,"formData",form(category),
                "privacyAcknowledgement",Map.of("acknowledged",true,"policyVersion",RegistrationFields.PRIVACY_VERSION)));
    }
    private Visitor visitor(String counter,String category) throws Exception {
        Browser staff=staff();String display=staff.create(counter,category);Browser browser=new Browser();browser.csrf();
        var response=browser.exchange(token(staff.get("/api/staff/registration-qr-sessions/"+display+"/current")));
        assertThat(response.statusCode()).isEqualTo(200);
        return new Visitor(browser,json.readValue(response.body(),QrEntryService.Entry.class),staff,display);
    }
    private String rootId() {return jdbc.queryForObject("SELECT CAST(id AS CHAR) FROM visitor_registrations ORDER BY id LIMIT 1",String.class);}
    private String entriesScope(String binding) {return jdbc.queryForObject("SELECT anonymous_scope_id FROM app_session_bindings WHERE id=?",String.class,binding);}
    /** Cookies and capabilities are private in-memory fixture state, never diagnostic record output. */
    private record Visitor(Browser browser,QrEntryService.Entry entry,Browser staff,String display) {
        @Override public String toString() {return "Visitor[redacted]";}
    }
    private void advance(long seconds) { now=now.plusSeconds(seconds);doReturn(now).when(clock).instant(); }
    private Browser staff() throws Exception { Browser browser=new Browser();browser.login("staff_qr");return browser; }
    private String token(HttpResponse<String> response) { return json.readValue(response.body(),QrEntryService.Current.class).entryUrl().split("#entry=")[1]; }
    /** Bounded futures turn a database deadlock/hang into a failed test rather than indefinite execution. */
    private List<Object> race(Callable<?> one,Callable<?> two) throws Exception {
        try(var pool=Executors.newFixedThreadPool(2)) {
            CountDownLatch start=new CountDownLatch(1);List<Future<Object>> futures=new ArrayList<>();
            for(Callable<?> action:List.of(one,two)) { futures.add(pool.submit(()->{start.await();try{return action.call();}catch(ApiFailure conflict){return conflict;}})); }
            start.countDown();return List.of(futures.get(0).get(15,TimeUnit.SECONDS),futures.get(1).get(15,TimeUnit.SECONDS));
        }
    }
    /** Actual HttpOnly cookies and framework CSRF are exercised; fixture credentials never leave the owned servlet. */
    private class Browser {
        final CookieManager cookies=new CookieManager(null,CookiePolicy.ACCEPT_ALL);
        final HttpClient client=HttpClient.newBuilder().cookieHandler(cookies).build();String csrf;
        HttpResponse<String> get(String path) throws Exception { return client.send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+path)).GET().build(),HttpResponse.BodyHandlers.ofString()); }
        HttpResponse<String> post(String path,Object body,boolean token) throws Exception {
            var request=HttpRequest.newBuilder(URI.create("http://localhost:"+port+path)).header("Content-Type","application/json");if(token) { request.header("X-CSRF-TOKEN",csrf); }
            return client.send(request.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
        }
        /** Raw submission permits strict parsing tests, retaining the exact serialized body/key on manual retries. */
        HttpResponse<String> submit(String body,String key,boolean withCsrf) throws Exception {
            var request=HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/public/registrations")).header("Content-Type","application/json");
            if(withCsrf) {request.header("X-CSRF-TOKEN",csrf);}if(key!=null) {request.header("Idempotency-Key",key);}
            return client.send(request.POST(HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
        }
        void csrf() throws Exception { csrf=json.readTree(get("/api/public/csrf").body()).path("token").asString(); }
        void login(String login) throws Exception { csrf();assertThat(post("/api/auth/login",Map.of("login",login,"password",PASSWORD),true).statusCode()).isEqualTo(200);csrf(); }
        String create(String counter,String category) throws Exception { var body=new HashMap<String,Object>();body.put("counterId",counter);body.put("categoryScope",category);var response=post("/api/staff/registration-qr-sessions",body,true);assertThat(response.statusCode()).isEqualTo(201);return json.readTree(response.body()).path("displaySessionId").asString(); }
        HttpResponse<String> exchange(String token) throws Exception { return post("/api/public/registration-entry/exchange",Map.of("entryToken",token),true); }
        HttpResponse<String> confirm(String token,FormContext old) throws Exception { return post("/api/public/registration-entry/exchange",Map.of("entryToken",token,"restartConfirmed",true,"expectedFormContext",old),true); }
        String binding() {
            String cookie=cookies.getCookieStore().getCookies().stream().filter(c->c.getName().equals("HSAAS_SESSION")).findFirst().orElseThrow().getValue();
            String session=new String(Base64.getDecoder().decode(cookie),StandardCharsets.UTF_8);
            return jdbc.queryForObject("SELECT b.id FROM app_session_bindings b JOIN SPRING_SESSION s ON s.PRIMARY_ID=b.spring_primary_id WHERE s.SESSION_ID=?",String.class,session);
        }
        String sessionId() { String value=cookies.getCookieStore().getCookies().stream().filter(c->c.getName().equals("HSAAS_SESSION")).findFirst().orElseThrow().getValue();return new String(Base64.getDecoder().decode(value),StandardCharsets.UTF_8); }
        String owner() { return jdbc.queryForObject("SELECT current_owner_context_id FROM app_session_bindings WHERE id=?",String.class,binding()); }
    }
}
