package eduupm.hsaas.auth;

import java.nio.CharBuffer;
import java.time.Clock;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import eduupm.hsaas.common.*;

/** Creates exactly one initial administrator without an HTTP endpoint or credential migration. */
@Service
public class BootstrapService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final PasswordEncoder passwords;
    private final LocalAuditPort audit;
    private final Clock clock;
    public BootstrapService(JdbcTemplate jdbc,TransactionTemplate tx,PasswordEncoder passwords,LocalAuditPort audit,Clock clock) {
        this.jdbc=jdbc; this.tx=tx; this.passwords=passwords; this.audit=audit; this.clock=clock;
    }
    /** The singleton barrier prevents two concurrent empty-database bootstraps from both succeeding. */
    public long initialize(String login,char[] password) {
        String canonical=LoginNames.canonical(login);
        if(password.length<12 || java.nio.charset.StandardCharsets.UTF_8.encode(CharBuffer.wrap(password)).remaining()>72) {
            throw new ApiFailure(400,"VALIDATION_FAILED","Use a 12 character or longer password within the hashing limit.");
        }
        String hash=passwords.encode(CharBuffer.wrap(password));
        return tx.execute(status -> {
            jdbc.queryForObject("SELECT id FROM identity_policy_gate WHERE id=1 FOR UPDATE",Integer.class);
            Boolean completed=jdbc.queryForObject("SELECT completed FROM bootstrap_state WHERE id=1 FOR UPDATE",Boolean.class);
            if(Boolean.TRUE.equals(completed) || jdbc.queryForObject("SELECT COUNT(*) FROM users",Integer.class)!=0) {
                throw new ApiFailure(409,"BOOTSTRAP_CLOSED","Initial account setup is closed.");
            }
            jdbc.update("INSERT INTO users(login,password_hash,role,active,created_at,updated_at) VALUES(?,?,'ADMIN',TRUE,?,?)",canonical,hash,DatabaseTime.sql(clock.instant()),DatabaseTime.sql(clock.instant()));
            Long id=jdbc.queryForObject("SELECT id FROM users WHERE login=?",Long.class,canonical);
            audit.append(LocalAuditPort.Action.ADMIN_BOOTSTRAPPED,"USER",Long.toString(id),id,new LocalAuditPort.Snapshot(null,"BOOTSTRAPPED",null,0L,"LOCAL"));
            jdbc.update("UPDATE bootstrap_state SET completed=TRUE WHERE id=1");
            return id;
        });
    }
}
