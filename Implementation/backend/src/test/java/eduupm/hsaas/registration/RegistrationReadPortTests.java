package eduupm.hsaas.registration;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.config.FoundationConfig;
import static org.assertj.core.api.Assertions.*;

/** Actual Spring scope suspend/resume lifecycle with a modeled root; real SQL/permissions are verified separately. */
class RegistrationReadPortTests {
    private final StubManager manager = new StubManager();
    private final TransactionTemplate outer = transaction(TransactionDefinition.PROPAGATION_REQUIRED);
    private final TransactionTemplate inner = transaction(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    private final StubReadRoot root = new StubReadRoot();
    private static final String OWNER = "65a4a03d-9bad-44cc-a83b-3b228635a333";

    /** Counts and items belong to one consumed scope; a second operation fails before any modeled SQL. */
    @Test void oneReadOperationOnlyAndCompletionCannotReuseIt() {
        var scope = outer.execute(status -> {
            var captured = root.captureReadScope(OWNER, "1");
            assertThat(root.readMaskedQueue(captured, new RegistrationReadPort.ReadQuery(null, null, 0, 10)).items()).hasSize(1);
            int reads = root.sqlReads;
            assertThatThrownBy(() -> root.readMaskedDetail(captured, "1")).isInstanceOf(IllegalStateException.class);
            assertThat(root.sqlReads).isEqualTo(reads);
            return captured;
        });
        int reads = root.sqlReads;
        assertThatThrownBy(() -> outer.execute(status -> root.readMaskedDetail(scope, "1"))).isInstanceOf(IllegalStateException.class);
        assertThat(root.sqlReads).isEqualTo(reads);
    }

    /** Suspended outer resources do not prove inner authority; the resumed scope is still valid. */
    @Test void requiresNewRejectsBeforeReadsAndOuterResumes() {
        outer.executeWithoutResult(status -> {
            var scope = root.captureReadScope(OWNER, "1");
            int reads = root.sqlReads;
            inner.executeWithoutResult(nested -> {
                assertThatThrownBy(() -> root.readMaskedDetail(scope, "1")).isInstanceOf(IllegalStateException.class);
                assertThat(root.sqlReads).isEqualTo(reads);
            });
            assertThat(root.readMaskedDetail(scope, "1").maskedVisitorName()).isEqualTo("A***");
        });
    }

    /** A factory cannot touch authorization SQL without RC; unused/rolled-back scopes expire as well. */
    @Test void factoryAndUnusedScopeAreTransactionFenced() {
        assertThatThrownBy(() -> root.captureReadScope(OWNER, "1")).isInstanceOf(IllegalStateException.class);
        assertThat(root.sqlReads).isZero();
        var badIsolation = transaction(TransactionDefinition.PROPAGATION_REQUIRED);
        badIsolation.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        assertThatThrownBy(() -> badIsolation.execute(status -> root.captureReadScope(OWNER, "1"))).isInstanceOf(IllegalStateException.class);
        assertThat(root.sqlReads).isZero();
        var unused = outer.execute(status -> {
            var scope = root.captureReadScope(OWNER, "1"); status.setRollbackOnly(); return scope;
        });
        int reads = root.sqlReads;
        assertThatThrownBy(() -> outer.execute(status -> root.readMaskedDetail(unused, "1"))).isInstanceOf(IllegalStateException.class);
        assertThat(root.sqlReads).isEqualTo(reads);
    }

    /** Null filters and the bounded offset match M04 query rules, without a conflicting independent page cap. */
    @Test void queryLimitsAndImmutableProjectionStayExact() {
        new RegistrationReadPort.ReadQuery(null, null, Integer.MAX_VALUE, 1);
        assertThatThrownBy(() -> new RegistrationReadPort.ReadQuery(null, null, Integer.MAX_VALUE, 2)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> new RegistrationReadPort.ReadQuery("ALL", null, 0, 10)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> new RegistrationReadPort.ReadQuery(null, "UNKNOWN", 0, 10)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> new RegistrationReadPort.ReadQuery(null, null, -1, 10)).isInstanceOf(ApiFailure.class);
        assertThatThrownBy(() -> new RegistrationReadPort.ReadQuery(null, null, 0, 51)).isInstanceOf(ApiFailure.class);
        var items = new ArrayList<>(List.of(item()));
        var page = new RegistrationReadPort.QueuePage(items, 1, 0, 10, "2026-10-10T00:00:00.000000Z");
        items.clear(); assertThat(page.items()).hasSize(1);
        assertThatThrownBy(() -> page.items().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    /** Required nullable fields serialize as explicit null and no scope/body/patient data enters the exact wire. */
    @Test void exactWireHasRequiredNullsAndNoInternalProperties() {
        var mapper = new FoundationConfig().jsonMapper();
        var detail = mapper.readTree(mapper.writeValueAsString(detail()));
        assertThat(detail.properties().stream().map(java.util.Map.Entry::getKey).toList()).containsExactlyInAnyOrder(
                "id", "publicReference", "counterId", "categoryCode", "maskedVisitorName", "destinationLabel", "status", "version", "submittedAt",
                "maskedIdentification", "maskedPhone", "maskedMrn", "mrnMode", "mrnFeedback", "environment", "source", "review");
        assertThat(detail.path("maskedMrn").isNull()).isTrue(); assertThat(detail.path("review").isNull()).isTrue();
        assertThatThrownBy(() -> mapper.readValue("{}", RegistrationReadPort.ReadScope.class)).isInstanceOf(RuntimeException.class);
        outer.executeWithoutResult(status -> {
            var scope = root.captureReadScope(OWNER, "1");
            assertThatThrownBy(() -> mapper.writeValueAsString(scope)).isInstanceOf(RuntimeException.class);
        });
    }

    /** Shared fixture projections deliberately contain only synthetic masked values. */
    private static RegistrationReadPort.QueueItem item() {
        return new RegistrationReadPort.QueueItem("1", "R-SYNTHETIC_REFERENCE", "1", "VENDOR", "A***", "Demo location", "SUBMITTED", 0,
                "2026-10-10T00:00:00.000000Z");
    }
    private static RegistrationReadPort.Detail detail() {
        var item = item();
        return new RegistrationReadPort.Detail(item.id(), item.publicReference(), item.counterId(), item.categoryCode(), item.maskedVisitorName(),
                item.destinationLabel(), item.status(), item.version(), item.submittedAt(), "***1234", "***6789", null, null, null, "test", "SYNTHETIC", null);
    }
    private TransactionTemplate transaction(int propagation) {
        var tx = new TransactionTemplate(manager); tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED); tx.setPropagationBehavior(propagation); return tx;
    }

    /** Modeled reads count entry points only; actual factory role/counter/Session metadata tests use disposable MySQL. */
    private static final class StubReadRoot implements RegistrationReadPort {
        private int sqlReads;
        @Override public ReadScope captureReadScope(String owner, String counter) {
            ReadScope.requireTransaction(); sqlReads++; return ReadScope.capture(owner, 1, counter);
        }
        @Override public QueuePage readMaskedQueue(ReadScope scope, ReadQuery query) {
            scope.consume(); sqlReads += 2; return new QueuePage(List.of(item()), 1, query.page(), query.pageSize(), "2026-10-10T00:00:00.000000Z");
        }
        @Override public Detail readMaskedDetail(ReadScope scope, String id) { scope.consume(); sqlReads++; return detail(); }
    }

    /** Spring manages the real synchronization lists; this lightweight manager has no datastore/authorization behavior. */
    private static final class StubManager extends AbstractPlatformTransactionManager {
        private final ThreadLocal<Boolean> active = new ThreadLocal<>();
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected boolean isExistingTransaction(Object tx) { return Boolean.TRUE.equals(active.get()); }
        @Override protected void doBegin(Object tx, TransactionDefinition definition) { active.set(true); }
        @Override protected Object doSuspend(Object tx) { Boolean previous = active.get(); active.remove(); return previous; }
        @Override protected void doResume(Object tx, Object suspended) { active.set((Boolean) suspended); }
        @Override protected void doCommit(DefaultTransactionStatus status) { }
        @Override protected void doRollback(DefaultTransactionStatus status) { }
        @Override protected void doCleanupAfterCompletion(Object tx) { active.remove(); }
    }
}
