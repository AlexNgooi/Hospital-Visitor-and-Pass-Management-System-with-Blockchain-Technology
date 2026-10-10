package eduupm.hsaas.hospital;

/** Returns minimum synthetic feedback only; matching is never a staff verification or a live patient lookup. */
public interface HospitalVerificationPort {
    Outcome verify(String syntheticMrn, String wardCode);
    String version();
    enum Outcome { MATCH, NO_MATCH, TIMEOUT, UNAVAILABLE }
}
