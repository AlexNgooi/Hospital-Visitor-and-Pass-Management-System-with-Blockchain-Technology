package eduupm.hsaas.reader;

import java.util.List;

/** Trusted adapter output is distinct from a browser command; future hardware must supply its own provenance. */
public interface ReaderPort {
    List<Sample> samples();
    Reading read(String sampleCode);

    /** Public synthetic selector exposes a catalogue code, never an editable UID/profile/category claim. */
    record Sample(String sampleCode,String categoryCode,String label) { }
    /** Raw UID is internal evidence and is masked in every browser inventory/history response. */
    record Reading(String sampleCode,String normalizedUid,String profileCode,String categoryCode,String cardCode) {
        @Override public String toString() { return "Reading[SIMULATED, UID=REDACTED]"; }
    }
}
