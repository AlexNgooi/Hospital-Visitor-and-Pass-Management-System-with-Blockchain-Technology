package eduupm.hsaas.registration;

import java.util.List;

/** C09 accepts only structural attestations, never patient documents, raw notes or client-selected provenance. */
public record ManualEvidence(String methodCode, List<String> basisCodes) {
    /** Copies caller collections so later mutation cannot alter evidence between validation and persistence. */
    public ManualEvidence {
        if (basisCodes != null) {
            basisCodes = java.util.Collections.unmodifiableList(new java.util.ArrayList<>(basisCodes));
        }
    }

    /** Unvalidated HTTP values must not leak into diagnostics through the generated record representation. */
    @Override public String toString() {
        return "ManualEvidence[REDACTED]";
    }
}
