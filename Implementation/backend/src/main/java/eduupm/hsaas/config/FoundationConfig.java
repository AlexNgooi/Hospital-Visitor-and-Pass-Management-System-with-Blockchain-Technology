package eduupm.hsaas.config;

import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.core.json.JsonFactory;
import tools.jackson.core.StreamReadConstraints;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.MapperFeature;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Owns the shared clock and strict JSON boundary rather than inheriting permissive defaults. */
@Configuration
@EnableConfigurationProperties(FoundationProperties.class)
public class FoundationConfig {
    /** Offline bootstrap and Web authentication share the same adaptive password format. */
    @Bean public PasswordEncoder passwordEncoder() { return PasswordEncoderFactories.createDelegatingPasswordEncoder(); }
    /** Uses UTC for persistence and allows deterministic deadline tests to replace the clock. */
    @Bean public Clock clock(FoundationProperties properties) {
        properties.validate();
        return Clock.systemUTC();
    }

    /** Rejects duplicate/unknown fields, excessive input, and implicit scalar conversions. */
    @Bean public JsonMapper jsonMapper() {
        var factory = JsonFactory.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
                .streamReadConstraints(StreamReadConstraints.builder().maxNestingDepth(32)
                        .maxStringLength(8192).maxDocumentLength(65536).build()).build();
        return JsonMapper.builder(factory).enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS).build();
    }
}
