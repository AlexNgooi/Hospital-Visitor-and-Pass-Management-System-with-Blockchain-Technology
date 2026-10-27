package eduupm.hsaas.reporting;

import java.time.Instant;
import java.time.format.DateTimeFormatter;

/** Safe assignment history projection: staff IDs and pass metadata never include visitor or patient fields. */
public record PassReportRow(String reference,String passReference,String cardCode,String category,
        String destination,String status,Instant issuedAt,String issuedBy,Instant dueAt,
        Instant returnedAt,String returnedBy,Instant closedAt,String closedBy,String operationMethod,String origin) {

    /** Issue and actual return are the agreed in/out records; a lost closure never supplies an out timestamp. */
    public String csv() {
        return CsvSafety.row(reference,"***",passReference,cardCode,category,destination,status,
                myt(issuedAt),issuedBy,dueAt==null?"No return deadline":myt(dueAt),
                returnedAt==null?"Not returned":myt(returnedAt),returnedBy,myt(closedAt),
                closedAt!=null && closedBy==null?"Unavailable (legacy)":closedBy,operationMethod,origin);
    }

    /** Explicit +08:00 offsets and full dates survive CSV import and workstation timezone differences. */
    private static String myt(Instant value) {
        return value==null?"":DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(value.atZone(ReportFilter.MYT));
    }

    /** Every column remains quoted and formula-neutralized by CsvSafety, including reference labels and IDs. */
    public static String header() {
        return CsvSafety.row("Registration reference","Visitor (masked)","Pass reference","Card code","Category",
                "Issued destination","Pass status","Issued / in (MYT)","Issued by staff ID","Return deadline (MYT)",
                "Actually returned / out (MYT)","Returned by staff ID","Closed (MYT)","Closed by staff ID","Operation method","Data origin");
    }
}
