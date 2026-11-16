package eduupm.hsaas.assignment;

import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.common.*;
import eduupm.hsaas.registration.RegistrationLifecyclePort;
import eduupm.hsaas.reporting.CsvSafety;
import static eduupm.hsaas.assignment.LifecycleStore.*;

/** Staff pass reads use keyset batches for scrolling; exports scan every matching batch under current authority. */
final class StaffPassReadService {
    private static final ZoneId MYT=ZoneId.of("Asia/Kuala_Lumpur");
    private static final DateTimeFormatter CSV_TIME=DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss XXX").withZone(MYT);
    private final LifecycleStore store;
    private final LifecycleSecurity security;
    private final RegistrationLifecyclePort roots;
    private final LocalAuditPort audit;
    private final TransactionTemplate tx;
    private final JsonMapper json;
    private final Clock clock;
    private final String environment;
    StaffPassReadService(LifecycleStore store,LifecycleSecurity security,RegistrationLifecyclePort roots,LocalAuditPort audit,
            TransactionTemplate tx,JsonMapper json,Clock clock,String environment) {
        this.store=store; this.security=security; this.roots=roots; this.audit=audit; this.tx=tx;
        this.json=json; this.clock=clock; this.environment=environment;
    }

    PassPage list(LifecycleSecurity.Context context,String body) {
        security.preflight(context,false);
        // Search text stays in a CSRF-protected POST body rather than request URLs or cursor metadata.
        var node=parse(body,Set.of("counterId","history","category","status","search","from","to","cursor"));
        for(String name:List.of("counterId","category","status","search")) if(!node.path(name).isString()) throw invalid();
        if(!node.path("history").isBoolean()) throw invalid();
        for(String name:List.of("from","to","cursor")) if(node.has(name) && !node.path(name).isString()) throw invalid();
        var filter=filter(node.path("counterId").asString(),node.path("history").asBoolean(),node.path("category").asString(),
                node.path("status").asString(),node.path("search").asString(),optional(node,"from"),optional(node,"to"));
        var before=cursor(optional(node,"cursor"));
        return tx.execute(status->{
            security.lock(context,false,List.of(filter.counter()));
            return scan(context,filter,before,clock.instant());
        });
    }

    /** Strict bounded read/export envelopes reject duplicate, unknown or trailing input without echoing search values. */
    private JsonNode parse(String body,Set<String> fields) {
        try {
            if(body==null || body.length()>2048) throw invalid();
            var node=json.rebuild().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
                    .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build().readTree(body);
            if(node==null || !node.isObject() || !fields.containsAll(node.propertyNames())) throw invalid();
            return node;
        } catch(ApiFailure failure) { throw failure; }
        catch(RuntimeException failure) { throw invalid(); }
    }
    private String optional(JsonNode node,String name) { return node.has(name)?node.path(name).asString():null; }

    /** Export is CSRF-protected and audited before any CSV is returned, and never silently truncates results. */
    Export export(LifecycleSecurity.Context context,String body) {
        security.preflight(context,false);
        Filter filter;
        try {
            var fields=Set.of("counterId","category","search","from","to");
            var node=parse(body,fields);
            if(node.size()!=fields.size()) throw invalid();
            for(String name:fields) if(!node.path(name).isString()) throw invalid();
            filter=filter(node.path("counterId").asString(),true,node.path("category").asString(),"ALL",
                    node.path("search").asString(),node.path("from").asString(),node.path("to").asString());
        } catch(ApiFailure failure) { throw failure; }
        catch(RuntimeException failure) { throw invalid(); }
        return tx.execute(status->{
            var actor=security.lock(context,false,List.of(filter.counter()));
            Instant now=clock.instant(); Cursor before=null; int count=0;
            var csv=new StringBuilder(CsvSafety.row("Visitor name","Category","Pass ID","Destination","Status","Issued (MYT)","Returned (MYT)"));
            do {
                var page=scan(context,filter,before,now);
                for(var row:page.items()) {
                    var pass=row.assignment();
                    if(++count>5000) throw tooLarge();
                    csv.append(CsvSafety.row(row.visitorName(),row.categoryCode(),pass.passReference(),pass.destinationLabel(),"Returned",
                            CSV_TIME.format(pass.issuedAt()),CSV_TIME.format(pass.returnedAt())));
                    if(csv.length()>650000) throw tooLarge();
                }
                before=cursor(page.nextCursor());
            } while(before!=null);
            var result=new Export("pass-history-"+filter.from()+"-"+filter.to()+".csv",csv.toString(),count);
            if(json.writeValueAsString(result).getBytes(StandardCharsets.UTF_8).length>900000) throw tooLarge();
            audit.append(LocalAuditPort.Action.REPORT_EXPORTED,"REPORT_EXPORT",UUID.randomUUID().toString(),actor.id(),
                    new LocalAuditPort.Snapshot(null,"EXPORTED",null,0L,"LOCAL"));
            return result;
        });
    }

    /** Assignment SQL never parses registration JSON; the registration root supplies bounded labels and name matching. */
    private PassPage scan(LifecycleSecurity.Context context,Filter filter,Cursor before,Instant now) {
        var matches=new ArrayList<PassRow>(); Cursor last=before; int scanned=0;
        while(scanned<10000) {
            var args=new ArrayList<Object>(List.of(filter.counter(),filter.counter(),environment));
            String sort=filter.history()?"a.returned_at":"a.issued_at";
            String where=" FROM card_assignments a JOIN cards c ON c.id=a.card_id WHERE a.issue_counter_id=? AND a.return_counter_id=?"
                    +" AND a.environment=? AND c.environment=a.environment AND "+CARD_SOURCE+" AND "+ASSIGNMENT_SOURCE;
            if(filter.history()) {
                where+=" AND a.closure_reason='RETURNED' AND a.returned_at IS NOT NULL AND a.returned_at>=? AND a.returned_at<?";
                args.add(DatabaseTime.sql(filter.start())); args.add(DatabaseTime.sql(filter.end()));
            } else {
                where+=" AND a.closed_at IS NULL AND c.status IN ('ISSUED','OVERDUE')";
                if(filter.state().equals("OVERDUE")) { where+=" AND a.due_at IS NOT NULL AND a.due_at<=?"; args.add(DatabaseTime.sql(now)); }
                if(filter.state().equals("ISSUED")) { where+=" AND (a.due_at IS NULL OR a.due_at>?)"; args.add(DatabaseTime.sql(now)); }
            }
            if(last!=null) {
                where+=" AND ("+sort+"<? OR ("+sort+"=? AND a.id<?))";
                args.add(DatabaseTime.sql(last.time())); args.add(DatabaseTime.sql(last.time())); args.add(last.id());
            }
            var batch=store.jdbc.query("SELECT a.*,c.card_code,c.status AS card_status"+where+" ORDER BY "+sort+" DESC,a.id DESC LIMIT 200",
                    (rs,n)->view(store.assignmentRow(rs),rs.getString("card_code"),rs.getString("card_status"),now),args.toArray());
            if(batch.isEmpty()) return new PassPage(List.copyOf(matches),null,now);
            var ids=batch.stream().map(AssignmentView::registrationId).distinct().toList();
            var visitors=roots.passVisitors(context.owner(),Long.toString(filter.counter()),ids,filter.search());
            for(var pass:batch) {
                scanned++; last=new Cursor(filter.history()?pass.returnedAt():pass.issuedAt(),pass.id());
                var visitor=visitors.get(pass.registrationId());
                if(visitor==null || !filter.category().equals("ALL") && !filter.category().equals(visitor.categoryCode())) continue;
                if(!filter.search().isEmpty() && !visitor.nameMatches()
                        && !pass.passReference().toLowerCase(Locale.ROOT).contains(filter.search())
                        && !pass.cardCode().toLowerCase(Locale.ROOT).contains(filter.search())) continue;
                matches.add(new PassRow(pass,visitor.displayName(),visitor.categoryCode()));
                if(matches.size()==50) return new PassPage(List.copyOf(matches),encode(last),now);
            }
            if(batch.size()<200) return new PassPage(List.copyOf(matches),null,now);
        }
        // A sparse search continues on the next scroll request rather than dropping later matches.
        return new PassPage(List.copyOf(matches),encode(last),now);
    }

    private Filter filter(String counter,boolean history,String category,String state,String search,String from,String to) {
        long counterId=LifecycleInput.decimal(counter);
        if(category==null || !Set.of("ALL","EXECUTIVE","PENJAGA","VENDOR","CONTRACTOR").contains(category)
                || state==null || !Set.of("ALL","ISSUED","OVERDUE").contains(state)
                || search==null || search.length()>100 || search.codePoints().anyMatch(value->Character.isISOControl(value)||Character.getType(value)==Character.FORMAT)) throw invalid();
        LocalDate first=null,last=null; Instant start=null,end=null;
        if(history) {
            try {
                if(from==null || to==null || !from.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}") || !to.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) throw invalid();
                first=LocalDate.parse(from); last=LocalDate.parse(to);
                if(first.isAfter(last) || first.getYear()<1000 || last.getYear()>9998) throw invalid();
                start=first.atStartOfDay(MYT).toInstant(); end=last.plusDays(1).atStartOfDay(MYT).toInstant();
            } catch(RuntimeException failure) { throw invalid(); }
        } else if(from!=null || to!=null) throw invalid();
        return new Filter(counterId,history,category,state,search.strip().toLowerCase(Locale.ROOT),first,last,start,end);
    }
    private Cursor cursor(String value) {
        if(value==null || value.isEmpty()) return null;
        try {
            if(!value.matches("[A-Za-z0-9_-]{1,160}")) throw invalid();
            String[] parts=new String(Base64.getUrlDecoder().decode(value),StandardCharsets.UTF_8).split("\\|",-1);
            if(parts.length!=2) throw invalid();
            Instant time=Instant.parse(parts[0]); String id=LifecycleInput.uuid(parts[1]);
            if(time.getNano()%1000!=0 || time.isBefore(Instant.parse("1000-01-01T00:00:00Z")) || time.isAfter(Instant.parse("9999-12-31T23:59:59Z"))) throw invalid();
            return new Cursor(time,id);
        } catch(RuntimeException failure) { throw invalid(); }
    }
    private String encode(Cursor value) {
        return value==null?null:Base64.getUrlEncoder().withoutPadding().encodeToString((value.time()+"|"+value.id()).getBytes(StandardCharsets.UTF_8));
    }
    private ApiFailure invalid() { return new ApiFailure(400,"VALIDATION_FAILED","Check the pass filters and date range."); }
    private ApiFailure tooLarge() { return new ApiFailure(413,"EXPORT_TOO_LARGE","Narrow the history filters before exporting."); }
    private record Filter(long counter,boolean history,String category,String state,String search,LocalDate from,LocalDate to,Instant start,Instant end) {
        @Override public String toString() { return "StaffPassFilter[REDACTED]"; }
    }
    private record Cursor(Instant time,String id) { }
    public record PassRow(AssignmentView assignment,String visitorName,String categoryCode) {
        @Override public String toString() { return "StaffPassRow[REDACTED]"; }
    }
    public record PassPage(List<PassRow> items,String nextCursor,Instant serverNow) { }
    public record Export(String filename,String csv,int rowCount) {
        @Override public String toString() { return "StaffPassExport[REDACTED]"; }
    }
}
