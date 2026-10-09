package eduupm.hsaas.registration.review;

import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import eduupm.hsaas.auth.Accounts;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.common.IdempotencyPort;
import eduupm.hsaas.common.LocalAuditPort;
import eduupm.hsaas.config.FoundationConfig;
import eduupm.hsaas.registration.RegistrationReviewPort;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Real Spring transaction boundaries with mock root/ports test orchestration only; no SQL persistence is claimed. */
class ReviewServiceTests {
    private final RegistrationReviewPort root = mock(RegistrationReviewPort.class);
    private final SessionCapabilities capabilities = mock(SessionCapabilities.class);
    private final Accounts accounts = mock(Accounts.class);
    private final IdempotencyPort idempotency = mock(IdempotencyPort.class);
    private final LocalAuditPort audit = mock(LocalAuditPort.class);
    private final RegistrationReviewPort.LockedRegistration receipt = mock(RegistrationReviewPort.LockedRegistration.class);
    private final RecordingTransactions manager = new RecordingTransactions();
    private final Accounts.Account staff = new Accounts.Account(7, "fixture_staff", "not-a-password", "COUNTER_STAFF", true, 0);
    private final ReviewService.StaffContext context = new ReviewService.StaffContext("fixture-binding", "fixture-owner", 1L, "fixture_staff");
    private final RegistrationReviewPort.ReviewCoordinates coordinates = new RegistrationReviewPort.ReviewCoordinates("1", "1");
    private final IdempotencyPort.SafeResult approved = new IdempotencyPort.SafeResult("1", "R-TEST-001", "VERIFIED", 1);
    private final String key = "09fbd5b9-6312-478e-ba27-f85056c9875d";
    private ReviewService service;
    private String body() { return "{\"expectedVersion\":0,\"identityConfirmed\":true,\"mrnConfirmed\":true,\"wardConfirmed\":true,"
        + "\"manualEvidence\":{\"methodCode\":\"SYNTHETIC_RECORD_COMPARISON\",\"basisCodes\":[\"IDENTITY_MATCH_CONFIRMED\",\"MRN_MATCH_CONFIRMED\",\"WARD_MATCH_CONFIRMED\"]}}"; }
    private IdempotencyPort.StoredResult stored() { return new IdempotencyPort.StoredResult(200, approved, new byte[32], "fixture", 1, Instant.parse("2026-10-10T00:00:00Z")); }

    @BeforeEach void configure() {
        when(capabilities.requireHuman(anyString(), anyString(), anyLong(), anyString())).thenAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse(); return staff;
        });
        when(accounts.lock(7)).thenReturn(staff);
        when(root.discover("1")).thenReturn(coordinates);
        when(root.lock(coordinates)).thenAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.getCurrentTransactionIsolationLevel()).isEqualTo(TransactionDefinition.ISOLATION_READ_COMMITTED);
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue(); return receipt;
        });
        when(receipt.status()).thenReturn("SUBMITTED"); when(receipt.version()).thenReturn(0L);
        when(idempotency.replay(any(), any())).thenReturn(Optional.empty());
        when(root.recordDecision(eq(receipt), eq(0L), eq(context.ownerContextId()), any())).thenReturn(approved);
        service = new ReviewService(root, capabilities, accounts, idempotency, audit, new FoundationConfig().jsonMapper(), manager);
    }

    /** Current authority precedes both replays, and decision/audit/idempotency share one transaction. */
    @Test void freshVerifyUsesOrderedGuardsAndSingleLocalCommit() {
        assertThat(service.verify(context, "1", key, body())).isEqualTo(approved);
        var order = inOrder(capabilities, accounts, root, idempotency, audit);
        order.verify(capabilities).requireHuman(anyString(), anyString(), anyLong(), anyString()); order.verify(root).discover("1");
        order.verify(accounts).lock(7); order.verify(capabilities).lockOwners(anyList(), isNull());
        order.verify(idempotency).replay(any(), any()); order.verify(root).lock(coordinates); order.verify(idempotency).replay(any(), any());
        order.verify(root).recordDecision(eq(receipt), eq(0L), eq(context.ownerContextId()), isA(RegistrationReviewPort.Verified.class));
        order.verify(audit).append(eq(LocalAuditPort.Action.REGISTRATION_VERIFIED), eq("REGISTRATION"), eq("1"), eq(7L), any());
        order.verify(idempotency).success(any(), any(), eq(200), eq(approved));
        assertThat(manager.commits).isEqualTo(1); assertThat(manager.rollbacks).isZero();
        var snapshot = ArgumentCaptor.forClass(LocalAuditPort.Snapshot.class);
        verify(audit).append(any(), anyString(), anyString(), anyLong(), snapshot.capture());
        assertThat(snapshot.getValue()).isEqualTo(new LocalAuditPort.Snapshot("SUBMITTED", "VERIFIED", 0L, 1L, "SYNTHETIC_MANUAL"));
    }
    /** A successful pre-lock replay ignores an old version and does not apply or audit the decision twice. */
    @Test void successfulReplayDoesNotLockOrReapplyRoot() {
        when(idempotency.replay(any(), any())).thenReturn(Optional.of(stored()));
        assertThat(service.verify(context, "1", key, body())).isEqualTo(approved);
        verify(root, never()).lock(any()); verify(root, never()).recordDecision(any(), anyLong(), anyString(), any());
        verifyNoInteractions(audit); verify(idempotency, never()).success(any(), any(), anyInt(), any());
    }
    /** A concurrent winner may be terminal by the time root.lock returns; the second replay still wins. */
    @Test void replayAfterRootLockPrecedesOldStateVersion() {
        when(receipt.status()).thenReturn("VERIFIED"); when(receipt.version()).thenReturn(1L);
        when(idempotency.replay(any(), any())).thenReturn(Optional.empty()).thenReturn(Optional.of(stored()));
        assertThat(service.verify(context, "1", key, body())).isEqualTo(approved);
        verify(root).lock(coordinates); verify(root, never()).recordDecision(any(), anyLong(), anyString(), any()); verifyNoInteractions(audit);
    }
    /** Unique insertion loss exits/rolls back before a new current-authority transaction reads the winner. */
    @Test void uniqueLoserOnlyReadsWinnerInNewTransaction() {
        when(idempotency.replay(any(), any())).thenReturn(Optional.empty()).thenReturn(Optional.empty()).thenReturn(Optional.of(stored()));
        doThrow(new DuplicateKeyException("synthetic uniqueness race")).when(idempotency).success(any(), any(), anyInt(), any());
        assertThat(service.verify(context, "1", key, body())).isEqualTo(approved);
        assertThat(manager.begins).isEqualTo(2); assertThat(manager.rollbacks).isEqualTo(1); assertThat(manager.commits).isEqualTo(1);
        verify(capabilities, times(2)).requireHuman(anyString(), anyString(), anyLong(), anyString());
        verify(capabilities, times(2)).lockOwners(anyList(), isNull()); verify(root, times(1)).recordDecision(any(), anyLong(), anyString(), any());
        verify(audit, times(1)).append(any(), anyString(), anyString(), anyLong(), any());
        verify(idempotency, times(1)).success(any(), any(), anyInt(), any());
    }
    /** No winner in the recovery transaction is a conflict, never permission to create a replacement command. */
    @Test void uniqueLoserWithoutWinnerDoesNotReapply() {
        doThrow(new DuplicateKeyException("synthetic uniqueness race")).when(idempotency).success(any(), any(), anyInt(), any());
        assertThatThrownBy(() -> service.verify(context, "1", key, body())).isInstanceOfSatisfying(ApiFailure.class, failure -> assertThat(failure.code()).isEqualTo("IDEMPOTENCY_CONFLICT"));
        assertThat(manager.begins).isEqualTo(2); assertThat(manager.rollbacks).isEqualTo(2);
        verify(root, times(1)).lock(any()); verify(root, times(1)).recordDecision(any(), anyLong(), anyString(), any());
    }
    /** A different-body winner remains a hash conflict when the loser inspects it after rollback. */
    @Test void uniqueRecoveryRejectsDifferentBodyWinner() {
        when(idempotency.replay(any(), any())).thenReturn(Optional.empty()).thenReturn(Optional.empty()).thenThrow(new ApiFailure(409, "IDEMPOTENCY_CONFLICT", "Safe conflict"));
        doThrow(new DuplicateKeyException("synthetic uniqueness race")).when(idempotency).success(any(), any(), anyInt(), any());
        assertThatThrownBy(() -> service.verify(context, "1", key, body())).isInstanceOfSatisfying(ApiFailure.class, failure -> assertThat(failure.status()).isEqualTo(409));
        verify(root, times(1)).recordDecision(any(), anyLong(), anyString(), any()); assertThat(manager.rollbacks).isEqualTo(2);
    }
    /** Revocation between the failed insert and recovery rechecks current counter access before stored result lookup. */
    @Test void uniqueRecoveryCannotBypassRevokedCounterAccess() {
        doNothing().doThrow(new ApiFailure(410, "REGISTRATION_ENTRY_REVOKED", "QR-only diagnostic")).when(capabilities).lockOwners(anyList(), isNull());
        doThrow(new DuplicateKeyException("synthetic uniqueness race")).when(idempotency).success(any(), any(), anyInt(), any());
        assertThatThrownBy(() -> service.verify(context, "1", key, body())).isInstanceOfSatisfying(ApiFailure.class, failure -> {
            assertThat(failure.status()).isEqualTo(404); assertThat(failure.code()).isEqualTo("NOT_FOUND");
        });
        verify(idempotency, times(2)).replay(any(), any()); verify(root, times(1)).recordDecision(any(), anyLong(), anyString(), any());
    }
    /** A role change after identity projection is detected under the first user lock and remains HTTP 403. */
    @Test void changedRoleDoesNotBecomeQr410OrObject404() {
        when(accounts.lock(7)).thenReturn(new Accounts.Account(7, "fixture_staff", "not-a-password", "ADMIN", true, 1));
        assertThatThrownBy(() -> service.verify(context, "1", key, body())).isInstanceOfSatisfying(ApiFailure.class, failure -> assertThat(failure.status()).isEqualTo(403));
        verify(capabilities, never()).lockOwners(anyList(), any()); verifyNoInteractions(idempotency, audit);
    }
    /** A dead session remains unauthenticated; it is not flattened into a missing registration. */
    @Test void expiredOwnerSessionRemains401() {
        doThrow(ApiFailure.unauthenticated()).when(capabilities).lockOwners(anyList(), isNull());
        assertThatThrownBy(() -> service.verify(context, "1", key, body())).isInstanceOfSatisfying(ApiFailure.class, failure -> assertThat(failure.status()).isEqualTo(401));
        verifyNoInteractions(idempotency, audit); verify(root, never()).lock(any());
    }
    /** Bad request bodies and missing keys cannot reveal whether an out-of-scope registration exists. */
    @Test void invisibleObjectPrecedesBodyAndKeyValidation() {
        doThrow(new ApiFailure(410, "REGISTRATION_ENTRY_REVOKED", "QR-only diagnostic")).when(capabilities).lockOwners(anyList(), isNull());
        assertThatThrownBy(() -> service.verify(context, "1", null, "{invalid")).isInstanceOfSatisfying(ApiFailure.class, failure -> {
            assertThat(failure.status()).isEqualTo(404); assertThat(failure.code()).isEqualTo("NOT_FOUND");
        });
        verifyNoInteractions(idempotency, audit); verify(root, never()).lock(any());
    }
    /** Any audit/storage failure rolls the whole command back and is not treated as a uniqueness winner. */
    @Test void auditFailureIsNotSuccessfulOrAutomaticallyRetried() {
        doThrow(new DataAccessResourceFailureException("synthetic unavailable audit")).when(audit).append(any(), anyString(), anyString(), anyLong(), any());
        assertThatThrownBy(() -> service.verify(context, "1", key, body())).isInstanceOf(DataAccessResourceFailureException.class);
        assertThat(manager.begins).isEqualTo(1); assertThat(manager.rollbacks).isEqualTo(1); assertThat(manager.commits).isZero();
        verify(idempotency, never()).success(any(), any(), anyInt(), any());
    }
    /** The root remains authoritative for state and version conflicts after a missed successful replay. */
    @Test void rootVersionConflictDoesNotWriteAuditOrResult() {
        when(root.recordDecision(any(), anyLong(), anyString(), any())).thenThrow(new ApiFailure(409, "VERSION_CONFLICT", "Safe conflict"));
        assertThatThrownBy(() -> service.verify(context, "1", key, body())).isInstanceOf(ApiFailure.class);
        verifyNoInteractions(audit); verify(idempotency, never()).success(any(), any(), anyInt(), any()); assertThat(manager.rollbacks).isEqualTo(1);
    }
    /** A malformed root success fails the transaction instead of creating an audit for a different registration. */
    @Test void unexpectedRootResultFailsClosed() {
        when(root.recordDecision(any(), anyLong(), anyString(), any())).thenReturn(new IdempotencyPort.SafeResult("2", "R-TEST-002", "VERIFIED", 1));
        assertThatThrownBy(() -> service.verify(context, "1", key, body())).isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(audit); verify(idempotency, never()).success(any(), any(), anyInt(), any());
    }
    /** Rejection uses the same local transaction with no evidence or external notification port. */
    @Test void rejectionWritesSingleLocalReasonDecision() {
        var rejected = new IdempotencyPort.SafeResult("1", "R-TEST-001", "REJECTED", 1);
        when(root.recordDecision(any(), anyLong(), anyString(), any())).thenReturn(rejected);
        assertThat(service.reject(context, "1", key, "{\"expectedVersion\":0,\"reasonCode\":\"INFORMATION_INCOMPLETE\"}")).isEqualTo(rejected);
        verify(root).recordDecision(eq(receipt), eq(0L), anyString(), eq(new RegistrationReviewPort.Rejected("INFORMATION_INCOMPLETE")));
        verify(audit).append(eq(LocalAuditPort.Action.REGISTRATION_REJECTED), eq("REGISTRATION"), eq("1"), eq(7L), eq(new LocalAuditPort.Snapshot("SUBMITTED", "REJECTED", 0L, 1L, "LOCAL")));
    }
    /** Joining a caller transaction would invert lock order; reject it before touching any domain port. */
    @Test void orchestrationCannotJoinCallerTransaction() {
        var outer = new TransactionTemplate(manager);
        assertThatThrownBy(() -> outer.execute(status -> service.verify(context, "1", key, body()))).isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(capabilities, root, idempotency, audit);
    }
    /** Default-off assembly remains absent, and enabling without the actual root dependency fails startup. */
    @Test void configurationRequiresRealRootDependency() {
        new org.springframework.boot.test.context.runner.ApplicationContextRunner().withUserConfiguration(ReviewConfiguration.class)
                .run(context -> assertThat(context).doesNotHaveBean(ReviewService.class));
        new org.springframework.boot.test.context.runner.ApplicationContextRunner().withUserConfiguration(ReviewConfiguration.class)
                .withPropertyValues("hsaas.review.enabled=true").run(context -> assertThat(context.getStartupFailure()).isNotNull());
    }

    /** Records actual Spring lifecycle boundaries only; this deliberately does not simulate JDBC rollback durability. */
    private static final class RecordingTransactions extends AbstractPlatformTransactionManager {
        private static final long serialVersionUID = 1L;
        int begins, commits, rollbacks;
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected void doBegin(Object transaction, TransactionDefinition definition) { begins++; }
        @Override protected void doCommit(DefaultTransactionStatus status) { commits++; }
        @Override protected void doRollback(DefaultTransactionStatus status) { rollbacks++; }
    }
}
