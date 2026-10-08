package eduupm.hsaas.common;

import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import eduupm.hsaas.config.FoundationProperties;

/** Exposes minimal readiness/capabilities while unavailable integrations stay closed on the server. */
@RestController
public class FoundationController {
    private final JdbcTemplate jdbc;
    private final FoundationProperties properties;
    public FoundationController(JdbcTemplate jdbc,FoundationProperties properties) { this.jdbc=jdbc; this.properties=properties; }

    /** Database failure becomes a safe 503, never an optimistic UP or a connection diagnostic. */
    @GetMapping("/api/health")
    public Map<String,String> health() { jdbc.queryForObject("SELECT 1",Integer.class); return Map.of("status","UP"); }

    /** Bootstrap does not publish counter scope, staff accounts, form fields, or fake task states. */
    @GetMapping({"/api/public/config/registration","/api/admin/integrations"})
    public Capabilities capabilities() {
        return new Capabilities(1,properties.environment(),properties.readerMode(),properties.mrnMode(),"NOT_ENABLED","NOT_ENABLED","LOCAL_ONLY");
    }

    /** Disabled writes do not create provider or blockchain jobs. */
    @PostMapping({"/api/admin/blockchain-proofs/{id}/verify","/api/admin/blockchain-proofs/{id}/retry"})
    public void disabled() { throw new ApiFailure(409,"INTEGRATION_DISABLED","Integration is not enabled."); }
    /** Derived states describe configured capabilities, not successful external delivery. */
    public record Capabilities(int schemaVersion,String environment,String readerMode,String mrnMode,
            String notificationStatus,String blockchainStatus,String auditStatus) { }
}
