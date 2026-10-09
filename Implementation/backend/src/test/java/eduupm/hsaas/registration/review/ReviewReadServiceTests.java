package eduupm.hsaas.registration.review;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import eduupm.hsaas.auth.Accounts;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.registration.RegistrationReadPort;
import eduupm.hsaas.registration.RegistrationReviewPort;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Real Spring RC lifecycle with mock facets proves order/denial only; M03 receipt SQL and HTTP tests remain separate. */
class ReviewReadServiceTests {
    private final RegistrationReadPort reads = mock(RegistrationReadPort.class);
    private final RegistrationReviewPort roots = mock(RegistrationReviewPort.class);
    private final SessionCapabilities capabilities = mock(SessionCapabilities.class);
    private final Accounts accounts = mock(Accounts.class);
    private final RegistrationReadPort.ReadScope scope = mock(RegistrationReadPort.ReadScope.class);
    private final RecordingTransactions manager = new RecordingTransactions();
    private final Accounts.Account staff = new Accounts.Account(7, "staff", "fixture", "COUNTER_STAFF", true, 0);
    private final ReviewService.StaffContext context = new ReviewService.StaffContext("binding", "owner", 1L, "staff");
    private final RegistrationReviewPort.ReviewCoordinates coordinates = new RegistrationReviewPort.ReviewCoordinates("1", "2");
    private final RegistrationReadPort.QueuePage page = mock(RegistrationReadPort.QueuePage.class);
    private final RegistrationReadPort.Detail detail = mock(RegistrationReadPort.Detail.class);
    private ReviewReadService service;

    @BeforeEach void configure() {
        when(capabilities.requireHuman(anyString(), anyString(), anyLong(), anyString())).thenAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse(); return staff;
        });
        when(accounts.lock(7)).thenReturn(staff); when(roots.discover("1")).thenReturn(coordinates);
        when(reads.captureReadScope("owner", "2")).thenAnswer(call -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
            assertThat(TransactionSynchronizationManager.getCurrentTransactionIsolationLevel()).isEqualTo(TransactionDefinition.ISOLATION_READ_COMMITTED);
            return scope;
        });
        when(page.page()).thenReturn(0); when(page.pageSize()).thenReturn(10); when(page.items()).thenReturn(List.of());
        when(detail.id()).thenReturn("1"); when(detail.counterId()).thenReturn("2");
        when(reads.readMaskedQueue(eq(scope), any())).thenReturn(page); when(reads.readMaskedDetail(scope, "1")).thenReturn(detail);
        service = new ReviewReadService(reads, roots, capabilities, accounts, manager);
    }

    /** A selected counter reaches the root only after current staff, user and the complete owner prefix are checked. */
    @Test void queueUsesGuardedSingleCounterInOneRcTransaction() {
        assertThat(service.queue(context, Map.of("counterId", List.of("2")))).isSameAs(page);
        var order = inOrder(capabilities, accounts, reads);
        order.verify(capabilities).requireHuman("binding", "owner", 1L, "staff"); order.verify(accounts).lock(7);
        order.verify(capabilities).lockOwners(List.of(new SessionCapabilities.OwnerUse("owner", 2)), null);
        order.verify(reads).captureReadScope("owner", "2");
        order.verify(reads).readMaskedQueue(scope, new RegistrationReadPort.ReadQuery(null, null, 0, 10));
        assertThat(manager.commits).isEqualTo(1); verifyNoInteractions(roots);
    }
    /** Internal discovery carries no capability; detail still takes the prefix before scope capture and its one root read. */
    @Test void detailChecksAuthorityAfterDiscoveryAndBeforeRead() {
        assertThat(service.detail(context, "1", Map.of())).isSameAs(detail);
        var order = inOrder(capabilities, roots, accounts, reads);
        order.verify(capabilities).requireHuman(anyString(), anyString(), anyLong(), anyString()); order.verify(roots).discover("1");
        order.verify(accounts).lock(7); order.verify(capabilities).lockOwners(anyList(), isNull());
        order.verify(reads).captureReadScope("owner", "2"); order.verify(reads).readMaskedDetail(scope, "1");
        verify(roots, never()).lock(any()); verify(roots, never()).recordDecision(any(), anyLong(), anyString(), any());
    }
    /** Even malformed query or ID requests first meet current human authentication and role boundaries. */
    @Test void deniedCurrentRolePrecedesQueryParsingAndDiscovery() {
        when(capabilities.requireHuman(anyString(), anyString(), anyLong(), anyString()))
                .thenReturn(new Accounts.Account(7, "staff", "fixture", "ADMIN", true, 1));
        failure(() -> service.queue(context, Map.of()), 403); failure(() -> service.detail(context, "bad-id", Map.of("actorId", List.of("9"))), 403);
        verifyNoInteractions(roots, accounts, reads); assertThat(manager.begins).isZero();
    }
    /** A downgrade after the pre-read is rechecked while the user lock is held, before counter/session or root access. */
    @Test void currentRoleInsideTransactionIsAuthoritative() {
        when(accounts.lock(7)).thenReturn(new Accounts.Account(7, "staff", "fixture", "ADMIN", true, 1));
        failure(() -> service.queue(context, Map.of("counterId", List.of("2"))), 403);
        verify(capabilities, never()).lockOwners(anyList(), any()); verifyNoInteractions(reads); assertThat(manager.rollbacks).isEqualTo(1);
    }
    /** Inactive or removed counter access uses fixed NOT_FOUND, while expired actual session remains 401. */
    @Test void hiddenCounterAndExpiredSessionKeepDistinctSafeBoundaries() {
        doThrow(new ApiFailure(410, "REGISTRATION_ENTRY_REVOKED", "internal QR message")).when(capabilities).lockOwners(anyList(), isNull());
        assertThatThrownBy(() -> service.detail(context, "1", Map.of())).isInstanceOfSatisfying(ApiFailure.class, denied -> {
            assertThat(denied.status()).isEqualTo(404); assertThat(denied.code()).isEqualTo("NOT_FOUND");
            assertThat(denied.getMessage()).isEqualTo("This registration is not available.");
        });
        doThrow(ApiFailure.unauthenticated()).when(capabilities).lockOwners(anyList(), isNull());
        failure(() -> service.queue(context, Map.of("counterId", List.of("2"))), 401); verifyNoInteractions(reads);
    }
    /** Missing or mismatched discovery never returns a public existence lookup and acquires no root read scope. */
    @Test void missingAndUnexpectedCoordinatesAreHidden() {
        failure(() -> service.detail(context, "2", Map.of()), 404);
        when(roots.discover("1")).thenReturn(new RegistrationReviewPort.ReviewCoordinates("2", "2"));
        failure(() -> service.detail(context, "1", Map.of()), 404); verifyNoInteractions(accounts, reads);
    }
    /** Unknown detail query cannot supply a second authority channel; duplicate queue filters never reach the root. */
    @Test void malformedQueriesDoNotCaptureScope() {
        failure(() -> service.detail(context, "1", Map.of("counterId", List.of("9"))), 400);
        failure(() -> service.queue(context, Map.of("counterId", List.of("2", "2"))), 400);
        verifyNoInteractions(accounts, roots, reads); assertThat(manager.begins).isZero();
    }
    /** An erroneous root projection is rejected before serialization, without automatically issuing another operation. */
    @Test void unexpectedRootProjectionFailsClosedWithoutReread() {
        when(detail.counterId()).thenReturn("3");
        assertThatThrownBy(() -> service.detail(context, "1", Map.of())).isInstanceOf(IllegalStateException.class);
        when(page.pageSize()).thenReturn(50);
        assertThatThrownBy(() -> service.queue(context, Map.of("counterId", List.of("2")))).isInstanceOf(IllegalStateException.class);
        verify(reads, times(2)).captureReadScope("owner", "2"); verify(reads).readMaskedDetail(scope, "1");
        verify(reads).readMaskedQueue(eq(scope), any()); assertThat(manager.rollbacks).isEqualTo(2);
    }
    /** Outer transactions must not retain binding/context pre-read locks and then chase a new counter. */
    @Test void callerTransactionIsRejectedBeforeAnyPort() {
        assertThatThrownBy(() -> new TransactionTemplate(manager).execute(status -> service.queue(context, Map.of("counterId", List.of("2")))))
                .isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(capabilities, accounts, reads, roots);
    }
    /** The module remains absent by default even when a caller provides no root dependencies. */
    @Test void defaultConfigurationDoesNotAssembleReads() {
        new org.springframework.boot.test.context.runner.ApplicationContextRunner().withUserConfiguration(ReviewConfiguration.class)
                .run(application -> assertThat(application).doesNotHaveBean(ReviewReadService.class));
    }
    /** A present write facet is insufficient: explicit review enabling must fail if the real read facet is missing. */
    @Test void explicitEnablingRequiresReadFacetAsWellAsWriteFacet() {
        new org.springframework.boot.test.context.runner.ApplicationContextRunner().withUserConfiguration(ReviewConfiguration.class)
                .withPropertyValues("hsaas.review.enabled=true")
                .withBean(RegistrationReviewPort.class, () -> roots).withBean(SessionCapabilities.class, () -> capabilities)
                .withBean(Accounts.class, () -> accounts)
                .withBean(eduupm.hsaas.common.IdempotencyPort.class, () -> mock(eduupm.hsaas.common.IdempotencyPort.class))
                .withBean(eduupm.hsaas.common.LocalAuditPort.class, () -> mock(eduupm.hsaas.common.LocalAuditPort.class))
                .withBean(tools.jackson.databind.json.JsonMapper.class, () -> new eduupm.hsaas.config.FoundationConfig().jsonMapper())
                .withBean(org.springframework.transaction.PlatformTransactionManager.class, () -> manager)
                .run(application -> assertThat(application.getStartupFailure()).hasStackTraceContaining("RegistrationReadPort"));
    }
    private void failure(Runnable action, int status) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiFailure.class, denied -> assertThat(denied.status()).isEqualTo(status));
    }
    /** Counts lifecycle only; no mock transaction count is evidence of MySQL locking or durability. */
    private static final class RecordingTransactions extends AbstractPlatformTransactionManager {
        private static final long serialVersionUID = 1L;
        int begins, commits, rollbacks;
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected void doBegin(Object transaction, TransactionDefinition definition) { begins++; }
        @Override protected void doCommit(DefaultTransactionStatus status) { commits++; }
        @Override protected void doRollback(DefaultTransactionStatus status) { rollbacks++; }
    }
}
