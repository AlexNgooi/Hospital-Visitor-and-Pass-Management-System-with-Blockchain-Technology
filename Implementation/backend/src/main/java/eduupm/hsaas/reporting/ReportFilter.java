package eduupm.hsaas.reporting;

import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.util.MultiValueMap;
import eduupm.hsaas.administration.AdminInputs;
import eduupm.hsaas.common.DatabaseTime;

/** MYT inclusive calendar dates become one half-open UTC interval shared by reports and exports. */
public record ReportFilter(LocalDate from,LocalDate to,Long categoryId,Long destinationId) {
    public static final ZoneId MYT=ZoneId.of("Asia/Kuala_Lumpur");
    /** Duplicate/unknown query keys cannot silently broaden a protected report. Maximum range is one year. */
    public static ReportFilter parse(MultiValueMap<String,String> query,Clock clock) {
        if(query.entrySet().stream().anyMatch(e->!Set.of("from","to","categoryId","destinationId").contains(e.getKey())||e.getValue().size()!=1))throw AdminInputs.invalid();
        LocalDate today=LocalDate.now(clock.withZone(MYT));
        try {
            LocalDate from=query.containsKey("from")?LocalDate.parse(query.getFirst("from")):today;
            LocalDate to=query.containsKey("to")?LocalDate.parse(query.getFirst("to")):today;
            if(from.isAfter(to)||java.time.temporal.ChronoUnit.DAYS.between(from,to)>365||from.getYear()<2000||to.getYear()>2100)throw AdminInputs.invalid();
            return new ReportFilter(from,to,query.containsKey("categoryId")?AdminInputs.id(query.getFirst("categoryId")):null,query.containsKey("destinationId")?AdminInputs.id(query.getFirst("destinationId")):null);
        }catch(DateTimeException failure){throw AdminInputs.invalid();}
    }
    public LocalDateTime start(){return DatabaseTime.sql(from.atStartOfDay(MYT).toInstant());}
    public LocalDateTime end(){return DatabaseTime.sql(to.plusDays(1).atStartOfDay(MYT).toInstant());}
    /** EXISTS matches any requested location while counting each registration once; aliases are service-owned. */
    public String scope(String alias){return (categoryId==null?"":" AND "+alias+".category_id=?")+(destinationId==null?"":" AND EXISTS (SELECT 1 FROM registration_destinations rd WHERE rd.registration_id="+alias+".id AND rd.destination_id=?)");}
    public List<Object> scopeArgs(){var args=new ArrayList<Object>();if(categoryId!=null)args.add(categoryId);if(destinationId!=null)args.add(destinationId);return args;}
    public List<Object> periodArgs(){var args=new ArrayList<Object>();args.add(start());args.add(end());args.addAll(scopeArgs());return args;}
}
