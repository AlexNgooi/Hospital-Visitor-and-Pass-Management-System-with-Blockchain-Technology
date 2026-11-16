package eduupm.hsaas.card;

import java.util.Map;
import eduupm.hsaas.common.ApiFailure;

/** Category prefixes are fixed by the system; the operator chooses a positive, nonsequential suffix. */
public final class PassNaming {
    private static final Map<String,String> PREFIXES=Map.of(
            "EXECUTIVE","exec-","PENJAGA","penj-","VENDOR","vend-","CONTRACTOR","cont-");
    private PassNaming() { }

    /** Validate new enrollment after replay lookup so historical successful requests keep their original receipt. */
    public static String canonical(String category,String code) {
        String prefix=PREFIXES.get(category);
        if(prefix==null || code==null || !code.startsWith(prefix)) throw invalid();
        String number=code.substring(prefix.length());
        if(!number.matches("[0-9]{1,4}")) throw invalid();
        int value=Integer.parseInt(number);
        if(value<1 || value>9999) throw invalid();
        return prefix+value;
    }

    private static ApiFailure invalid() {
        return new ApiFailure(400,"PASS_NUMBER_INVALID","Use the category prefix and a number from 1 to 9999.");
    }
}
