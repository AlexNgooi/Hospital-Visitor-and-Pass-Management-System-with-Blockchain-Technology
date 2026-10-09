package eduupm.hsaas.registrationentry;

import java.net.URI;
import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Explicit opt-in isolates the console/foundation from QR secrets; enabled entry always fails closed. */
@ConfigurationProperties("hsaas.qr")
public record QrProperties(boolean enabled, String origin, String activeKey, Map<String,String> keys) {
    /** Secret values never become configuration diagnostics. */
    @Override public String toString() { return "QrProperties[enabled="+enabled+", secrets=REDACTED]"; }
    /** Origin is configured, never reconstructed from Host or forwarded headers. */
    public URI validatedOrigin(String environment) {
        try {
            URI uri=URI.create(origin);
            boolean loopback=java.util.Set.of("localhost","127.0.0.1","[::1]").contains(uri.getHost());
            boolean dev=java.util.Set.of("development","test").contains(environment);
            if(uri.getHost()==null || uri.getRawUserInfo()!=null || uri.getRawQuery()!=null || uri.getRawFragment()!=null
                    || !(uri.getRawPath().isEmpty() || uri.getRawPath().equals("/"))
                    || !("https".equals(uri.getScheme()) || (dev && loopback && "http".equals(uri.getScheme())))) {
                throw new IllegalArgumentException();
            }
            return URI.create(uri.getScheme()+"://"+uri.getRawAuthority());
        } catch(RuntimeException invalid) { throw new IllegalStateException("Configure a controlled QR HTTPS origin or explicit development loopback origin"); }
    }
}
