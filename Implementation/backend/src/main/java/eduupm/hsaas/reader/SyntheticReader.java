package eduupm.hsaas.reader;

import java.util.ArrayList;
import java.util.List;
import eduupm.hsaas.common.ApiFailure;

/** A finite server-owned demonstration catalogue; no browser supplied UID or unknown profile can enter inventory. */
public final class SyntheticReader implements ReaderPort {
    private static final List<String> CATEGORIES=List.of("EXECUTIVE","PENJAGA","VENDOR","CONTRACTOR");
    private final List<Sample> samples;
    public SyntheticReader() {
        var rows=new ArrayList<Sample>();
        for(String category:CATEGORIES) for(int serial=1;serial<=12;serial++) {
            String code="DEMO-"+category+"-"+String.format(java.util.Locale.ROOT,"%03d",serial);
            rows.add(new Sample(code,category,code));
        }
        samples=List.copyOf(rows);
    }
    @Override public List<Sample> samples() { return samples; }

    /** Category and approved synthetic profile are derived exclusively from this adapter's fixed mapping. */
    @Override public Reading read(String sampleCode) {
        var sample=samples.stream().filter(value->value.sampleCode().equals(sampleCode)).findFirst()
                .orElseThrow(()->new ApiFailure(409,"SCAN_PROFILE_UNKNOWN","Select a supported synthetic sample."));
        int category=CATEGORIES.indexOf(sample.categoryCode())+1;
        int serial=Integer.parseInt(sample.sampleCode().substring(sample.sampleCode().length()-3));
        return new Reading(sample.sampleCode(),String.format(java.util.Locale.ROOT,"04%02X000000%04X",category,serial),
                "SYNTHETIC_"+sample.categoryCode()+"_V1",sample.categoryCode(),"C-"+sample.sampleCode());
    }
}
