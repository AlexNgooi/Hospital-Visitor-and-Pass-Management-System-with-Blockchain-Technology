package eduupm.hsaas.registration.review;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import eduupm.hsaas.common.ApiFailure;
import static org.assertj.core.api.Assertions.*;

/** Tests wire ambiguity, bounded SQL pagination and safe diagnostics without claiming database authorization. */
class ReviewQueriesTests {
    /** Absent optional filters preserve the frozen zero-based ten-row queue contract. */
    @Test void defaultsAndExplicitBoundariesArePreserved() {
        assertThat(ReviewQueries.queue(Map.of("counterId", List.of("1"))))
                .isEqualTo(new ReviewQueries.QueueSelection("1", null, null, 0, 10));
        assertThat(ReviewQueries.queue(Map.of("counterId", List.of("9223372036854775807"), "category", List.of("PENJAGA"),
                "status", List.of("VERIFIED"), "page", List.of("2"), "pageSize", List.of("50"))))
                .isEqualTo(new ReviewQueries.QueueSelection("9223372036854775807", "PENJAGA", "VERIFIED", 2, 50));
    }
    /** Duplicate keys are rejected even when both values agree; neither servlet ordering nor last-value wins is authority. */
    @Test void duplicateAndUnknownParametersFailClosed() {
        invalid(Map.of("counterId", List.of("1", "1")));
        invalid(Map.of("counterId", List.of("1"), "page", List.of("0", "1")));
        invalid(Map.of("counterId", List.of("1"), "actorId", List.of("7")));
    }
    /** Missing IDs and non-canonical long representations cannot reach a root lookup. */
    @Test void counterIdMustBeCanonicalPositiveLong() {
        invalid(Map.of());
        for (String id : List.of("", "0", "01", "-1", "1.0", " 1", "9223372036854775808", "1/2")) {
            invalid(Map.of("counterId", List.of(id)));
        }
    }
    /** Empty/unknown filter labels are distinct from intentionally absent filters. */
    @Test void filtersUseOnlyFrozenCodes() {
        for (String value : List.of("", "ALL", "penjaga", "PATIENT", "PENJAGA ")) {
            invalid(Map.of("counterId", List.of("1"), "category", List.of(value)));
        }
        for (String value : List.of("", "ALL", "APPROVED", "submitted")) {
            invalid(Map.of("counterId", List.of("1"), "status", List.of(value)));
        }
    }
    /** Negative/fractional/overflow sizes and page-offset overflow are rejected before SQL conversion. */
    @Test void paginationCannotOverflowOrExceedFiftyRows() {
        for (String value : List.of("0", "51", "-1", "1.0", "01", "+1", "2147483648", "99999999999")) {
            invalid(Map.of("counterId", List.of("1"), "pageSize", List.of(value)));
        }
        for (String value : List.of("-1", "1.0", "01", "+1", "2147483648", "2147483647")) {
            invalid(Map.of("counterId", List.of("1"), "page", List.of(value)));
        }
        assertThat(ReviewQueries.queue(Map.of("counterId", List.of("1"), "page", List.of("2147483647"),
                "pageSize", List.of("1"))).page()).isEqualTo(Integer.MAX_VALUE);
    }
    /** Malformed internal collections still emit a fixed safe error without echoing the rejected value. */
    @Test void nullEmptyAndOversizedInputUsesSafeDiagnostics() {
        invalid(null);
        var nullValue = new HashMap<String, List<String>>(); nullValue.put("counterId", null); invalid(nullValue);
        invalid(Map.of("counterId", List.of()));
        invalid(Map.of("counterId", List.of("1"), "category", List.of("private-input".repeat(10))));
    }
    private void invalid(Map<String, List<String>> values) {
        assertThatThrownBy(() -> ReviewQueries.queue(values)).isInstanceOfSatisfying(ApiFailure.class, failure -> {
            assertThat(failure.status()).isEqualTo(400); assertThat(failure.code()).isEqualTo("VALIDATION_FAILED");
            assertThat(failure.getMessage()).isEqualTo("Check the registration queue filters.");
        });
    }
}
