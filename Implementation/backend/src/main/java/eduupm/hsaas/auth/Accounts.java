package eduupm.hsaas.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import eduupm.hsaas.common.ApiFailure;

/** Loads staff credentials; account status and role determine operational access. */
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
                rs.getString("role"), rs.getBoolean("active"), rs.getLong("security_epoch"), rs.getBoolean("password_change_required"),
                eduupm.hsaas.common.DatabaseTime.instant(rs.getObject("temporary_password_expires_at",java.time.LocalDateTime.class))), login);
        if (rows.isEmpty()) { throw new UsernameNotFoundException("Invalid credentials"); }
        return rows.getFirst();
    }

    /** Locks the principal before downstream binding and capability locks. */
    public Account lock(long id) {
        var rows = jdbc.query("SELECT * FROM users WHERE id=? FOR UPDATE", (rs, n) -> new Account(
                rs.getLong("id"), rs.getString("login"), rs.getString("password_hash"),
                rs.getString("role"), rs.getBoolean("active"), rs.getLong("security_epoch"), rs.getBoolean("password_change_required"),
                eduupm.hsaas.common.DatabaseTime.instant(rs.getObject("temporary_password_expires_at",java.time.LocalDateTime.class))), id);
        if (rows.isEmpty()) { throw ApiFailure.unauthenticated(); }
        return rows.getFirst();
    }

    /** HTTP identifiers are decimal strings to avoid JavaScript long precision loss. */
    public Me view(Account account) {
        return new Me(Long.toString(account.id()), account.login(), account.role(), account.canHandleVisitors(), account.passwordChangeRequired());
    }

    /** Credential-bearing objects stay internal and are never controller responses. */
    public record Account(long id, String login, String passwordHash, String role, boolean active, long epoch, boolean passwordChangeRequired, java.time.Instant temporaryPasswordExpiresAt) {
        /** Keeps internal fixtures and bootstrap callers source compatible with established accounts. */
        public Account(long id,String login,String hash,String role,boolean active,long epoch) { this(id,login,hash,role,active,epoch,false,null); }
        /** Active staff can handle visitors after password setup; administrators retain their own role. */
        public boolean canHandleVisitors() { return active && role.equals("COUNTER_STAFF") && !passwordChangeRequired; }
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
    /** staffAccessEnabled is a derived capability for existing clients, never a separate account setting. */
    public record Me(String id, String login, String role, boolean staffAccessEnabled, boolean passwordChangeRequired) {}
}
