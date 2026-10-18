package eduupm.hsaas.reporting;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import eduupm.hsaas.administration.AdminAccess;
import eduupm.hsaas.auth.AccountChanges.Proof;
import eduupm.hsaas.common.*;

/** Real MySQL read model: period activity and current inventory are explicitly different metrics. */
@Service
public class ReportingService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final AdminAccess access;
    private final LocalAuditPort audit;
    private final Clock clock;
    private final JsonMapper json;
    public ReportingService(JdbcTemplate jdbc,TransactionTemplate tx,AdminAccess access,LocalAuditPort audit,Clock clock,JsonMapper json){
        this.jdbc=jdbc;this.tx=new TransactionTemplate(tx.getTransactionManager());this.tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        this.access=access;this.audit=audit;this.clock=clock;this.json=json;
    }

    /** One UNION statement reads all metric groups from one statement snapshot, with one captured due-time boundary. */
    public Report report(Proof proof,ReportFilter filter){
        return tx.execute(status->{access.require(proof);Instant now=clock.instant();validateReferences(filter);
            var sql=new ArrayList<String>();var args=new ArrayList<Object>();
            add(sql,args,"visits","SELECT COUNT(*) FROM visitor_registrations r WHERE r.submitted_at>=? AND r.submitted_at<?"+filter.scope("r"),filter.periodArgs());
            add(sql,args,"issued","SELECT COUNT(*) FROM card_assignments a JOIN visitor_registrations r ON r.id=a.registration_id WHERE a.issued_at>=? AND a.issued_at<?"+filter.scope("r"),filter.periodArgs());
            add(sql,args,"returned","SELECT COUNT(*) FROM card_assignments a JOIN visitor_registrations r ON r.id=a.registration_id WHERE a.returned_at>=? AND a.returned_at<?"+filter.scope("r"),filter.periodArgs());
            add(sql,args,"lost","SELECT COUNT(*) FROM card_assignments a JOIN visitor_registrations r ON r.id=a.registration_id WHERE a.closure_reason='LOST' AND a.closed_at>=? AND a.closed_at<?"+filter.scope("r"),filter.periodArgs());
            add(sql,args,"inUse","SELECT COUNT(*) FROM card_assignments a JOIN visitor_registrations r ON r.id=a.registration_id WHERE a.closed_at IS NULL"+filter.scope("r"),filter.scopeArgs());
            var dueArgs=new ArrayList<Object>();dueArgs.add(DatabaseTime.sql(now));dueArgs.addAll(filter.scopeArgs());
            add(sql,args,"overdue","SELECT COUNT(*) FROM card_assignments a JOIN visitor_registrations r ON r.id=a.registration_id WHERE a.closed_at IS NULL AND a.due_at<=?"+filter.scope("r"),dueArgs);
            // Unassigned inventory has no ward. Only the category filter applies to these denominators.
            String cardScope=filter.categoryId()==null?"":" AND category_id=?";List<Object> cardArgs=filter.categoryId()==null?List.of():List.of(filter.categoryId());
            add(sql,args,"available","SELECT COUNT(*) FROM cards WHERE status='AVAILABLE'"+cardScope,cardArgs);
            add(sql,args,"inventory","SELECT COUNT(*) FROM cards WHERE 1=1"+cardScope,cardArgs);
            add(sql,args,"issuedCards","SELECT COUNT(*) FROM cards WHERE status IN ('ISSUED','OVERDUE')"+cardScope,cardArgs);
            sql.add("SELECT 'category' metric,r.category_code label,COUNT(*) amount FROM visitor_registrations r WHERE r.submitted_at>=? AND r.submitted_at<?"+filter.scope("r")+" GROUP BY r.category_code");args.addAll(filter.periodArgs());
            // UTC DATETIME plus eight hours yields MYT without depending on MySQL timezone tables.
            sql.add("SELECT 'day' metric,DATE_FORMAT(DATE_ADD(r.submitted_at,INTERVAL 8 HOUR),'%Y-%m-%d') label,COUNT(*) amount FROM visitor_registrations r WHERE r.submitted_at>=? AND r.submitted_at<?"+filter.scope("r")+" GROUP BY label");args.addAll(filter.periodArgs());
            var values=jdbc.query(String.join(" UNION ALL ",sql),(rs,n)->new Metric(rs.getString(1),rs.getString(2),rs.getLong(3)),args.toArray());
            return new Report(filter.from().toString(),filter.to().toString(),now,"Asia/Kuala_Lumpur","SYNTHETIC / SIMULATED",values,rows(filter,51));
        });
    }

    /** A successful export is audited and committed before the controller releases its body. Over-limit requests return no partial CSV. */
    public Export export(Proof proof,ReportFilter filter){
        return tx.execute(status->{var actor=access.require(proof);validateReferences(filter);var items=rows(filter,10001);
            if(items.size()>10000)throw new ApiFailure(422,"EXPORT_TOO_LARGE","Narrow the report range to at most 10000 registrations.");
            String id=UUID.randomUUID().toString();Instant now=clock.instant();
            var body=new StringBuilder("\uFEFF").append(CsvSafety.row("Reference","Visitor (masked)","Category","Ward / destination","Registration status","Submitted (MYT)"));
            for(var row:items)body.append(CsvSafety.row(row.reference(),row.visitor(),row.category(),row.destination(),row.status(),DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(row.submittedAt().atZone(ReportFilter.MYT))));
            var result=new Export(id,"hsaas-masked-"+filter.from()+"-"+filter.to()+".csv",body.toString(),items.size(),now);
            // Measure the actual escaped JSON, since quotes/backslashes/control characters may expand well beyond CSV bytes.
            if(json.writeValueAsString(result).getBytes(java.nio.charset.StandardCharsets.UTF_8).length>1047552)throw new ApiFailure(422,"EXPORT_TOO_LARGE","Narrow the report range.");
            jdbc.update("INSERT INTO report_exports(id,actor_id,from_date,to_date,category_id,destination_id,created_at,row_count) VALUES(?,?,?,?,?,?,?,?)",id,actor.id(),filter.from(),filter.to(),filter.categoryId(),filter.destinationId(),DatabaseTime.sql(now),items.size());
            audit.append(LocalAuditPort.Action.REPORT_EXPORTED,"REPORT_EXPORT",id,actor.id(),new LocalAuditPort.Snapshot(null,"EXPORTED",null,0L,"LOCAL"));
            jdbc.update("INSERT INTO administration_history(entity_kind,entity_id,version,reason_code,actor_id,changed_at) VALUES('EXPORT',?,0,'REPORT_EXPORT',?,?)",id,actor.id(),DatabaseTime.sql(now));
            return result;
        });
    }

    /** This query deliberately never selects form_data, phone, document identifiers or MRN. */
    private List<ReportRow> rows(ReportFilter filter,int limit){
        var args=filter.periodArgs();args.add(limit);
        return jdbc.query("SELECT r.public_reference,r.category_code,d.name,r.status,r.submitted_at FROM visitor_registrations r JOIN destinations d ON d.id=r.destination_id WHERE r.submitted_at>=? AND r.submitted_at<?"+filter.scope("r")+" ORDER BY r.submitted_at,r.id LIMIT ?",
            (rs,n)->new ReportRow(rs.getString(1),"***",rs.getString(2),rs.getString(3),rs.getString(4),DatabaseTime.instant(rs.getObject(5,LocalDateTime.class))),args.toArray());
    }
    /** Unknown filters are client errors, while inactive historical reference IDs remain valid filters. */
    private void validateReferences(ReportFilter filter){
        if(filter.categoryId()!=null&&jdbc.queryForObject("SELECT COUNT(*) FROM visitor_categories WHERE id=?",Integer.class,filter.categoryId())!=1)throw new ApiFailure(400,"VALIDATION_FAILED","Unknown category.");
        if(filter.destinationId()!=null&&jdbc.queryForObject("SELECT COUNT(*) FROM destinations WHERE id=?",Integer.class,filter.destinationId())!=1)throw new ApiFailure(400,"VALIDATION_FAILED","Unknown destination.");
    }
    /** Fixed metric keys and SQL fragments are service-owned; filter values always use placeholders. */
    private void add(List<String> sql,List<Object> args,String key,String query,List<Object> parameters){sql.add("SELECT '"+key+"' metric,'' label,("+query+") amount");args.addAll(parameters);}
    public record Metric(String metric,String label,long amount){}
    public record ReportRow(String reference,String visitor,String category,String destination,String status,Instant submittedAt){}
    public record Report(String from,String to,Instant serverUpdatedAt,String timezone,String origin,List<Metric> metrics,List<ReportRow> preview){}
    /** A bounded JSON export envelope allows the existing CSRF/authenticated client to download without a second unaudited GET. */
    public record Export(String id,String filename,String csv,int rowCount,Instant serverUpdatedAt){}
}
