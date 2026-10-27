package eduupm.hsaas.hospital;

/** Deterministic demo feedback without network/clinical data; manual mode explicitly defers checking to staff. */
public final class SyntheticHospitalAdapter implements HospitalVerificationPort {
    private final String mode;
    public SyntheticHospitalAdapter(String mode) {
        if (!java.util.Set.of("mock", "manual").contains(mode)) { throw new IllegalArgumentException("Live hospital access is not enabled"); }
        this.mode = mode;
    }
    /** These documented fixture values exercise each outcome and do not represent hospital MRNs. */
    @Override public Outcome verify(String mrn, String ward) {
        if (mode.equals("manual")) { return Outcome.UNAVAILABLE; }
        if (mrn.equals("DEMO-MRN-TIMEOUT")) { return Outcome.TIMEOUT; }
        if (mrn.equals("DEMO-MRN-UNAVAILABLE")) { return Outcome.UNAVAILABLE; }
        return java.util.Set.of("DEMO-MRN-4821", "DEMO-MRN-MATCH").contains(mrn) ? Outcome.MATCH : Outcome.NO_MATCH;
    }
    @Override public String version() { return "synthetic-mrn-v2"; }
    /** Fixed fixtures are explicit mock identities; an absent catalogue ward is handled as unavailable by the service. */
    @Override public Lookup lookup(String mrn) {
        var outcome = verify(mrn, "DEMO_WARD");
        return new Lookup(outcome, outcome == Outcome.MATCH
                ? new Patient("Pesakit Demo 4821", "DEMO_WARD", "DEMO-BED-01") : null);
    }
}
