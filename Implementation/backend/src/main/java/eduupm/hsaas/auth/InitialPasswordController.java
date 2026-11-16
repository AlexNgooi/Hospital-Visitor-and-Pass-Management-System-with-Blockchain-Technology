package eduupm.hsaas.auth;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.*;
import eduupm.hsaas.common.*;

/** A restricted first-login session cannot obtain workspace access before this committed credential change. */
@RestController
public class InitialPasswordController {
    private final JdbcTemplate jdbc; private final TransactionTemplate tx; private final Accounts accounts;
    private final SessionCapabilities capabilities; private final PasswordEncoder passwords; private final LocalAuditPort audit; private final Clock clock;
    public InitialPasswordController(JdbcTemplate jdbc,TransactionTemplate tx,Accounts accounts,SessionCapabilities capabilities,PasswordEncoder passwords,LocalAuditPort audit,Clock clock) {
        this.jdbc=jdbc;this.tx=tx;this.accounts=accounts;this.capabilities=capabilities;this.passwords=passwords;this.audit=audit;this.clock=clock;
    }
    /** The old password is rechecked under the account lock; successful changes revoke every old session by epoch. */
    @PostMapping("/api/auth/change-password")
    public Map<String,Boolean> change(@RequestBody Change input,HttpServletRequest request) {
        if(input==null || input.currentPassword()==null || input.currentPassword().getBytes(StandardCharsets.UTF_8).length>72
                || input.newPassword()==null || input.newPassword().length()<12 || input.newPassword().getBytes(StandardCharsets.UTF_8).length>72
                || !input.newPassword().equals(input.confirmPassword())) throw new ApiFailure(400,"VALIDATION_FAILED","Use matching passwords of at least 12 characters and at most 72 UTF-8 bytes.");
        String hash=passwords.encode(input.newPassword());
        var session=request.getSession(false); if(session==null) throw ApiFailure.unauthenticated();
        String login=SecurityContextHolder.getContext().getAuthentication().getName();
        long id=accounts.find(login).id();
        tx.executeWithoutResult(status->{
            accounts.lock(id);
            var actor=capabilities.requireCredentialSession((String)session.getAttribute(SessionCapabilities.BINDING),
                    (String)session.getAttribute(SessionCapabilities.CONTEXT),(Long)session.getAttribute(SessionCapabilities.GENERATION),login);
            if(!actor.passwordChangeRequired()) throw new ApiFailure(409,"PASSWORD_ALREADY_SET","The initial password has already been replaced. Sign in again.");
            if(!passwords.matches(input.currentPassword(),actor.passwordHash()) || passwords.matches(input.newPassword(),actor.passwordHash()))
                throw new ApiFailure(400,"PASSWORD_INVALID","Check the temporary password and choose a different new password.");
            jdbc.update("UPDATE users SET password_hash=?,password_change_required=FALSE,temporary_password_expires_at=NULL,security_epoch=security_epoch+1,version=version+1,updated_at=? WHERE id=?",hash,DatabaseTime.sql(clock.instant()),id);
            audit.append(LocalAuditPort.Action.PASSWORD_CHANGED,"USER",Long.toString(id),id,new LocalAuditPort.Snapshot(null,"ACTIVE",null,null,"LOCAL"));
        });
        session.invalidate(); SecurityContextHolder.clearContext();
        return Map.of("saved",true);
    }
    /** Secret-bearing request objects never expose their values through diagnostics. */
    public record Change(String currentPassword,String newPassword,String confirmPassword) {
        @Override public String toString() { return "Change[REDACTED]"; }
    }
}
