package eduupm.hsaas.registration.review;

import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.registration.RegistrationVersions;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

/** Bounded explicit reveal precondition rejects duplicate properties, trailing JSON and scalar coercion. */
final class ReviewFieldsRequest {
    private static final JsonMapper JSON = JsonMapper.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build();
    private ReviewFieldsRequest() { }
    static long version(String body) {
        try {
            if (body == null || body.length()>256) throw new IllegalArgumentException();
            var node = JSON.readerFor(tools.jackson.databind.JsonNode.class).with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
                    .readValue(body);
            var input = (tools.jackson.databind.JsonNode)node;
            if (!input.isObject() || input.size()!=1 || !input.path("expectedVersion").isIntegralNumber()
                    || !input.path("expectedVersion").canConvertToLong()) throw new IllegalArgumentException();
            return RegistrationVersions.checked(input.path("expectedVersion").asLong());
        } catch (RuntimeException failure) {
            throw new ApiFailure(400,"VALIDATION_FAILED","Check the review field version.");
        }
    }
}
