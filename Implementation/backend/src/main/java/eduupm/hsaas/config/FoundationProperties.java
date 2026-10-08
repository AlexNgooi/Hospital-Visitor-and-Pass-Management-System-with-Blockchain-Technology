package eduupm.hsaas.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Validates release capabilities before an adapter or browser session can be created. */
@ConfigurationProperties("hsaas")
public record FoundationProperties(String environment, String readerMode, String mrnMode,
        String notificationMode, String blockchainMode, boolean secureCookie,
        Duration requestIdle, Duration staffAbsolute, Duration anonymousAbsolute,
        Duration activationTtl, String hashKeyVersion, String hashKey, java.util.Map<String,String> hashKeys) {

    /** Configuration diagnostics must never include current or retained secret material. */
    @Override public String toString() {
        return "FoundationProperties[environment="+environment+", secrets=REDACTED]";
    }

    /** Rejects unavailable integrations and insecure cookies outside explicit local/test profiles. */
    public void validate() {
        if (!java.util.Set.of("production", "development", "synthetic", "test").contains(environment)
                || !java.util.Set.of("disabled", "mock").contains(readerMode)
                || (readerMode.equals("mock") && !java.util.Set.of("synthetic", "test").contains(environment))
                || !java.util.Set.of("mock", "manual").contains(mrnMode)
                || !"disabled".equals(notificationMode) || !"disabled".equals(blockchainMode)
                || (!secureCookie && !java.util.Set.of("development", "test").contains(environment))) {
            throw new IllegalStateException("Invalid foundation mode or cookie configuration");
        }
        for (Duration duration : java.util.List.of(requestIdle, staffAbsolute, anonymousAbsolute, activationTtl)) {
            if (duration.isZero() || duration.isNegative()) {
                throw new IllegalStateException("Session durations must be positive");
            }
        }
    }
}
