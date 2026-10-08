package eduupm.hsaas.auth;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import eduupm.hsaas.common.ApiFailure;

/** Loads real staff credentials and supplies the authoritative role/counter projection. */
@Service
public class Accounts implements UserDetailsService {
    private final JdbcTemplate jdbc;
    public Accounts(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Spring's provider handles hashing and consistent invalid-credential responses. */
    @Override public UserDetails loadUserByUsername(String username) {
        var account = find(LoginNames.canonical(username));
        return new StaffPrincipal(account);
    }

    /** Looks up canonical accounts without publishing existence to a caller. */
    public Account find(String login) {
        var rows = jdbc.query("SELECT * FROM users WHERE login=?", (rs, n) -> new Account(
                rs.getLong("id"), rs.getString("login"), rs.getString("password_hash"),
                rs.getString("role"), rs.getBoolean("active"), rs.getLong("security_epoch")), login);
        if (rows.isEmpty()) { throw new UsernameNotFoundException("Invalid credentials"); }
        return rows.getFirst();
    }

    /** Locks the principal before downstream counter, binding, and capability locks. */
    public Account lock(long id) {
        var rows = jdbc.query("SELECT * FROM users WHERE id=? FOR UPDATE", (rs, n) -> new Account(
                rs.getLong("id"), rs.getString("login"), rs.getString("password_hash"),
                rs.getString("role"), rs.getBoolean("active"), rs.getLong("security_epoch")), id);
        if (rows.isEmpty()) { throw ApiFailure.unauthenticated(); }
        return rows.getFirst();
    }

    /** HTTP identifiers are decimal strings to avoid JavaScript long precision loss. */
    public Me view(Account account) {
        List<String> counters = account.role().equals("COUNTER_STAFF") ? jdbc.query(
                "SELECT p.counter_id FROM user_counter_permissions p JOIN counters c ON c.id=p.counter_id "
                        + "WHERE p.user_id=? AND p.active=TRUE AND c.active=TRUE ORDER BY p.counter_id",
                (rs, n) -> Long.toString(rs.getLong(1)), account.id()) : List.of();
        return new Me(Long.toString(account.id()), account.login(), account.role(), counters);
    }

    /** Credential-bearing objects stay internal and are never controller responses. */
    public record Account(long id, String login, String passwordHash, String role, boolean active, long epoch) {
        /** Internal credentials are redacted even during accidental diagnostic formatting. */
        @Override public String toString() { return "Account[id="+id+", credentials=REDACTED]"; }
    }
    /** Captures the epoch at password verification so a concurrent policy edit cannot authorize an old proof. */
    public static final class StaffPrincipal extends User {
        private static final long serialVersionUID=1L;
        private final long actorId;
        private final long securityEpoch;
        public StaffPrincipal(Account account) {
            super(account.login(),account.passwordHash(),account.active(),true,true,true,
                    java.util.List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_"+account.role())));
            actorId=account.id(); securityEpoch=account.epoch();
        }
        public long actorId() { return actorId; }
        public long securityEpoch() { return securityEpoch; }
    }
    /** Minimal authenticated projection defined by C01. */
    public record Me(String id, String login, String role, List<String> counterIds) { }
}
