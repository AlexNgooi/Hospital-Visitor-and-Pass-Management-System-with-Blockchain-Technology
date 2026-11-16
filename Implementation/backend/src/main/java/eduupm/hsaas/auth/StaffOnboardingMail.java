package eduupm.hsaas.auth;

import java.net.URI;
import java.util.Properties;
import org.springframework.core.env.Environment;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;
import eduupm.hsaas.common.ApiFailure;

/** Sends only explicitly requested onboarding mail; no scheduler, plaintext persistence or automatic retry exists. */
@Service
public class StaffOnboardingMail {
    private final Environment env;
    public StaffOnboardingMail(Environment env) { this.env=env; }
    /** Configuration readiness does not claim SMTP connectivity or delivery to an inbox. */
    public boolean configured() {
        if (!env.getProperty("hsaas.staff-email.enabled",Boolean.class,false)) return false;
        try {
            String host=env.getProperty("hsaas.staff-email.host","");
            String from=env.getProperty("hsaas.staff-email.from","");
            URI url=URI.create(env.getProperty("hsaas.staff-email.login-url",""));
            boolean local=java.util.Set.of("127.0.0.1","localhost","[::1]").contains(url.getHost()==null?"":url.getHost());
            int port=env.getProperty("hsaas.staff-email.port",Integer.class,587);
            return port>0 && port<=65535 && !host.isBlank() && host.chars().noneMatch(Character::isISOControl) && validEmail(from)
                    && url.getHost()!=null && url.getUserInfo()==null && url.getFragment()==null
                    && ("https".equals(url.getScheme()) || local && "http".equals(url.getScheme()));
        } catch (RuntimeException invalid) { return false; }
    }
    public void requireConfigured() {
        if (!configured()) throw new ApiFailure(409,"STAFF_EMAIL_NOT_CONFIGURED","Staff email is not configured. No account was created.");
    }
    /** Header-safe ASCII addresses are bounded; inbox ownership still requires the recipient's sign-in. */
    public static boolean validEmail(String value) {
        return value!=null && value.length()<=254 && value.matches("[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+");
    }
    /** SMTP acceptance is not delivery. Any exception yields UNKNOWN without exposing provider diagnostics. */
    public String send(String email,String login,String password) {
        try {
            requireConfigured();
            var sender=new JavaMailSenderImpl();
            sender.setHost(env.getProperty("hsaas.staff-email.host"));
            sender.setPort(env.getProperty("hsaas.staff-email.port",Integer.class,587));
            String user=env.getProperty("hsaas.staff-email.username","");
            sender.setUsername(user); sender.setPassword(env.getProperty("hsaas.staff-email.password",""));
            var properties=new Properties();
            properties.setProperty("mail.debug","false");
            properties.setProperty("mail.smtp.auth",Boolean.toString(!user.isBlank()));
            properties.setProperty("mail.smtp.starttls.enable","true");
            properties.setProperty("mail.smtp.starttls.required","true");
            properties.setProperty("mail.smtp.ssl.checkserveridentity","true");
            properties.setProperty("mail.smtp.connectiontimeout","5000");
            properties.setProperty("mail.smtp.timeout","5000");
            properties.setProperty("mail.smtp.writetimeout","5000");
            sender.setJavaMailProperties(properties);
            var message=new SimpleMailMessage();
            message.setFrom(env.getProperty("hsaas.staff-email.from")); message.setTo(email);
            message.setSubject("HSAAS staff account: set your password");
            message.setText("Your HSAAS staff account is ready.\nLogin: "+login+"\nTemporary password: "+password
                    +"\nSign in: "+env.getProperty("hsaas.staff-email.login-url")
                    +"\nThis temporary password expires in 24 hours. You must replace it on first sign-in."
                    +"\nIf this account was not expected, contact your administrator.");
            sender.send(message); return "ACCEPTED";
        } catch (RuntimeException failure) { return "UNKNOWN"; }
    }
}
