package eduupm.hsaas.registration.review;

import java.util.List;
import java.util.Map;
import java.util.Set;
import eduupm.hsaas.common.ApiFailure;

/** Parses bounded review selections only; a caller counter ID never grants authorization to the root read port. */
public final class ReviewQueries {
    private static final Set<String> FIELDS = Set.of("counterId", "category", "status", "page", "pageSize");
    private static final Set<String> CATEGORIES = Set.of("EXECUTIVE", "PENJAGA", "VENDOR", "CONTRACTOR");
    private static final Set<String> STATUSES = Set.of("SUBMITTED", "VERIFIED", "REJECTED", "CANCELLED");
    private ReviewQueries() { }

    /** Current staff authentication must run before parsing; duplicate/unknown parameters cannot change scope silently. */
    public static QueueSelection queue(Map<String, List<String>> values) {
        if (values == null || !FIELDS.containsAll(values.keySet())) throw invalid();
        for (var entry : values.entrySet()) {
            if (entry.getValue() == null || entry.getValue().size() != 1
                    || entry.getValue().getFirst() == null || entry.getValue().getFirst().length() > 64) throw invalid();
        }
        String counterId = single(values, "counterId");
        requireId(counterId);
        String category = single(values, "category"), status = single(values, "status");
        if (category != null && !CATEGORIES.contains(category) || status != null && !STATUSES.contains(status)) throw invalid();
        int page = number(single(values, "page"), 0);
        int size = number(single(values, "pageSize"), 10);
        // Bound multiplication before the root SQL limit/offset conversion, including extreme numeric caller input.
        if (size < 1 || size > 50 || (long) page * size > Integer.MAX_VALUE) throw invalid();
        return new QueueSelection(counterId, category, status, page, size);
    }

    /** Decimal identities are wire selections; permission is checked using the current server session in another layer. */
    public static void requireId(String value) {
        try {
            if (value == null || !value.matches("[1-9][0-9]{0,18}") || Long.parseLong(value) < 1) throw invalid();
        } catch (NumberFormatException failure) { throw invalid(); }
    }
    private static String single(Map<String, List<String>> values, String name) {
        return values.containsKey(name) ? values.get(name).getFirst() : null;
    }
    private static int number(String value, int fallback) {
        if (value == null) return fallback;
        try {
            if (!value.matches("0|[1-9][0-9]{0,9}")) throw invalid();
            return Integer.parseInt(value);
        } catch (NumberFormatException failure) { throw invalid(); }
    }
    private static ApiFailure invalid() { return new ApiFailure(400, "VALIDATION_FAILED", "Check the registration queue filters."); }

    /** This immutable validated filter still carries no role/counter capability and cannot be a root authority receipt. */
    public record QueueSelection(String counterId, String category, String status, int page, int pageSize) { }
}
