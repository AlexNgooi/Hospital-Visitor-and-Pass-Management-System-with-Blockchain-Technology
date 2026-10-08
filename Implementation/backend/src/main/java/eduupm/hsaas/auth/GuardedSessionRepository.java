package eduupm.hsaas.auth;

import java.util.Map;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.session.Session;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Wraps real JDBC saves: domain capability activation is strictly after a confirmed save. */
public class GuardedSessionRepository implements FindByIndexNameSessionRepository<Session> {
    private final FindByIndexNameSessionRepository<Session> delegate;
    private final JdbcIndexedSessionRepository cleanupDelegate;
    private final SessionCapabilities capabilities;
    private final ThreadLocal<Session> current = new ThreadLocal<>();
    /** The JDBC concrete Session is package-private; this adapter uses only sessions created by that repository. */
    @SuppressWarnings("unchecked")
    public GuardedSessionRepository(JdbcIndexedSessionRepository delegate, SessionCapabilities capabilities) {
        this.delegate=(FindByIndexNameSessionRepository<Session>)(FindByIndexNameSessionRepository<?>)delegate;
        this.cleanupDelegate=delegate; this.capabilities=capabilities;
    }

    /** Tracks the actual request Session object, including mutations performed by HttpSession. */
    @Override public Session createSession() { var session=delegate.createSession(); current.set(session); return session; }
    /** Framework lookup never grants QR authority or refreshes an owner's capability. */
    @Override public Session findById(String id) { var session=delegate.findById(id); current.set(session); return session; }

    /** Saves with zero domain locks, then confirms metadata in a separate bounded REQUIRED transaction. */
    @Override public void save(Session session) {
        requireOutsideDomain();
        // This bounded check ends before the framework transaction; stale writes cannot revive old state.
        capabilities.beforeFrameworkSave(session.getAttribute(SessionCapabilities.BINDING),
                session.getAttribute(SessionCapabilities.CONTEXT),session.getAttribute(SessionCapabilities.GENERATION));
        delegate.save(session);
        capabilities.confirmedSave(session.getId(), session.getAttribute(SessionCapabilities.BINDING),
                session.getAttribute(SessionCapabilities.CONTEXT), session.getAttribute(SessionCapabilities.GENERATION));
    }

    /** Deletion cannot run before the domain revocation barrier has committed. */
    @Override public void deleteById(String id) {
        requireOutsideDomain(); capabilities.revokeSession(id); delegate.deleteById(id);
    }
    /** Index lookup is only for controlled maintenance, never for client-selected principal scope. */
    @Override public Map<String,Session> findByIndexNameAndIndexValue(String index,String value) {
        return delegate.findByIndexNameAndIndexValue(index,value);
    }

    /** Explicit login persistence uses the same object that the framework will save at request end. */
    public void persistCurrent(String sessionId) {
        var session=current.get();
        if(session==null || !session.getId().equals(sessionId)) { throw new IllegalStateException("No current framework Session"); }
        save(session);
    }

    /** Prevents pool-thread reuse from exposing a previous request's Session. */
    public void clearRequest() { current.remove(); }

    /** Cleanup is storage maintenance; deadline checks do not depend on this scheduler. */
    @Scheduled(fixedDelay=60000)
    public void cleanupExpiredSessions() { cleanupDelegate.cleanUpExpiredSessions(); }

    /** REQUIRES_NEW framework work must never suspend a domain transaction that owns capability locks. */
    private static void requireOutsideDomain() {
        if(TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("Framework session writes cannot run inside a domain transaction");
        }
    }
}
