package eduupm.hsaas.hospital;

/** Returns minimum synthetic feedback only; matching is never a staff verification or a live patient lookup. */
public interface HospitalVerificationPort {
    Outcome verify(String syntheticMrn, String wardCode);
    String version();
    /** Older adapters remain source compatible and cannot accidentally fabricate patient details. */
    default Lookup lookup(String syntheticMrn) { return new Lookup(Outcome.UNAVAILABLE, null); }
    enum Outcome { MATCH, NO_MATCH, TIMEOUT, UNAVAILABLE }
    /** Minimal synthetic display snapshot only; never serialize the record as diagnostic text. */
    record Patient(String patientName, String wardCode, String bed) {
        @Override public String toString() { return "Patient[REDACTED]"; }
    }
    record Lookup(Outcome outcome, Patient patient) {
        @Override public String toString() { return "Lookup[REDACTED]"; }
    }
}
