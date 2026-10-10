# C15 masked read facet — reviewed draft

Historical exact candidate was approved and implemented at f5a9c7f; RegistrationReadPort.java and READ_CONTRACT_HANDOFF.md are authoritative. This does not alter the six approved C13 write dependency files. One M03 SQL root implements both facets. M04 owns GET HTTP/query/authority orchestration.

```java
package eduupm.hsaas.registration;

import java.util.List;

/** Only current server owner/counter authority can mint an exact-transaction masked-read scope. */
public interface RegistrationReadPort {
    /** M04 first takes the full prefix; the root safely re-enters only that same prefix and verifies actual metadata. */
    ReadScope captureReadScope(String serverOwnerContextId, String counterId);

    /** Consumes the one-use scope before count/items SQL and filters the exact authorized counter. */
    QueuePage readMaskedQueue(ReadScope scope, ReadQuery query);

    /** Consumes the scope before any SQL; missing and cross-counter IDs are uniformly NOT_FOUND. */
    Detail readMaskedDetail(ReadScope scope, String registrationId);

    /** Null filters mean ALL; canonical codes, page>=0, pageSize 1–50, offset<=Integer.MAX_VALUE are validated, not silently coerced. */
    record ReadQuery(String category, String status, int page, int pageSize) { }

    /** Queue wire follows M04 exactly; total and versions remain safe JSON integers. */
    record QueuePage(List<QueueItem> items, long total, int page, int pageSize, String serverNow) { }

    /** No caller sees the root JSON; only non-sensitive references, controlled labels and masked identity. */
    record QueueItem(String id, String publicReference, String counterId, String categoryCode,
            String maskedVisitorName, String destinationLabel, String status, long version, String submittedAt) { }

    /** Required nullable MRN/review fields are emitted as null; mock feedback never says staff-verified. */
    record Detail(String id, String publicReference, String counterId, String categoryCode,
            String maskedVisitorName, String destinationLabel, String status, long version, String submittedAt,
            String maskedIdentification, String maskedPhone, String maskedMrn, String mrnMode, String mrnFeedback,
            String environment, String source, ReviewMetadata review) { }

    /** Server actor/time/source and C09 codes only; no raw evidence, free note, clinical data or full body. */
    record ReviewMetadata(String actorId, String reviewedAt, String source, String methodCode,
            List<String> basisCodes, String reasonCode) { }

    /** Private constructor/package capture; exact marker/resource/one-use checks mirror the approved write receipt. */
    final class ReadScope {
        // Implementation owns private server actor, counter, exact synchronization marker and safe internal accessors.
        // A root-only capture factory registers that marker; consume checks RC/marker/resource before any SQL.
        // Completion releases unused receipts; REQUIRES_NEW or future transaction consumption is denied.
        private ReadScope() { }
    }
}
```

The implemented ReadScope will take root-derived coordinates through its package-only factory, not accept HTTP construction or caller-supplied actor. Factory calls M00 lockOwners(OwnerUse(serverOwnerContextId,counterId)) before its current owner projection, mapping QR-specific 410 to404 and keeping401/403 distinct; the controller supplies the real context. This protects standalone root port use and safely re-enters M04's already-held same prefix. M04 never calls requireHuman after opening a write/read transaction then follows it with new counter locks.

Queue SQL uses current bound actor+counter joins, category/status filters and submittedAt DESC,id DESC. Count+items share one RC scope operation under stable current permission locks. A scope is not a bearer and cannot authorize a different counter/detail. Property order is immaterial; all required nullable fields are present. DTO field names exactly match M04 source03eca76 contracts.ts; publicReference uses the now-approved R- prefix.

The Java source implementation will add validated immutable list copies and safe query errors, while preserving these public methods/records. No second pagination scheme or raw form_data read is introduced.
