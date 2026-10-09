package eduupm.hsaas.registrationentry;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Exposes only the entry capability flag, with no key, token, owner or operational scope. */
@RestController
@org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication(type=org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication.Type.SERVLET)
public class QrCapabilitiesController {
    private final QrProperties properties;
    public QrCapabilitiesController(QrProperties properties) { this.properties=properties; }
    @GetMapping("/api/public/registration-entry/capabilities")
    public Capabilities capabilities(HttpServletResponse response) {
        response.setHeader("Cache-Control","no-store");response.setHeader("Referrer-Policy","no-referrer");return new Capabilities(properties.enabled());
    }
    /** Public bootstrap is read-only and does not create a grant. */
    public record Capabilities(boolean enabled) { }
}
