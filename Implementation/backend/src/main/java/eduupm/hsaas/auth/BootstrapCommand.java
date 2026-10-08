package eduupm.hsaas.auth;

import java.util.Arrays;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.stereotype.Component;
import org.springframework.web.context.WebApplicationContext;

/** Explicit offline-only initializer; normal Web startup never reads or creates credentials. */
@Component
@ConditionalOnProperty(name="hsaas.bootstrap.enabled",havingValue="true")
public class BootstrapCommand implements ApplicationRunner {
    private final BootstrapService service;
    private final ApplicationContext context;
    public BootstrapCommand(BootstrapService service,ApplicationContext context) { this.service=service; this.context=context; }
    /** Requires a real console, suppresses echo, and wipes the input buffer on all outcomes. */
    @Override public void run(ApplicationArguments arguments) {
        var console=System.console();
        if(context instanceof WebApplicationContext || console==null) { throw new IllegalStateException("Bootstrap requires an offline interactive console"); }
        String login=console.readLine("Staff account: "); char[] password=console.readPassword("Initial administrator password: ");
        if(login==null || password==null) { throw new IllegalStateException("Bootstrap input cancelled"); }
        try { service.initialize(login,password); console.printf("Initial administrator created.%n"); }
        finally { Arrays.fill(password,'\0'); }
        // This one-shot command releases pools and scheduled maintenance instead of becoming a daemon.
        ((ConfigurableApplicationContext)context).close();
    }
}
