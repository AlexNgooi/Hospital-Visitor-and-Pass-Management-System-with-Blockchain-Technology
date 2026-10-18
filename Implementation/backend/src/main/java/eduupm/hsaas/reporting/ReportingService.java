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
import eduupm.hsaas.config.FoundationProperties;

/** Real MySQL read model: period activity and current inventory are explicitly different metrics. */
@Service
public class ReportingService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final AdminAccess access;
    private final LocalAuditPort audit;
    private final Clock clock;
    private final JsonMapper json;
    private final String environment;
    public ReportingService(JdbcTemplate jdbc,TransactionTemplate tx,AdminAccess access,LocalAuditPort audit,Clock clock,JsonMapper json,FoundationProperties properties){
        this.jdbc=jdbc;this.tx=new TransactionTemplate(tx.getTransactionManager());this.tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        this.access=access;this.audit=audit;this.clock=clock;this.json=json;this.environment=properties.environment();
    }

    /** One UNION statement reads all metric groups from one statement snapshot, with one captured due-time boundary. */
    public Report report(Proof proof,ReportFilter filter){
        return tx.execute(status->{access.require(proof);Instant now=clock.instant();validateReferences(filter);
            var sql=new ArrayList<String>();var args=new ArrayList<Object>();
            String registrationScope=registrationScope(filter);
            // Both sides of an assignment join must belong to this deployment and retain their approved demo provenance.
            String assignmentScope=registrationScope+" AND a.environment=? AND a.operation_origin='SIMULATED'";
            add(sql,args,"visits","SELECT COUNT(*) FROM visitor_registrations r WHERE r.submitted_at>=? AND r.submitted_at<?"+registrationScope,registrationArgs(filter,true));
            var assignmentPeriodArgs=registrationArgs(filter,true);assignmentPeriodArgs.add(environment);
            var assignmentCurrentArgs=registrationArgs(filter,false);assignmentCurrentArgs.add(environment);
            add(sql,args,"issued","SELECT COUNT(*) FROM card_assignments a JOIN visitor_registrations r ON r.id=a.registration_id WHERE a.issued_at>=? AND a.issued_at<?"+assignmentScope,assignmentPeriodArgs);
            add(sql,args,"returned","SELECT COUNT(*) FROM card_assignments a JOIN visitor_registrations r ON r.id=a.registration_id WHERE a.returned_at>=? AND a.returned_at<?"+assignmentScope,assignmentPeriodArgs);
            add(sql,args,"lost","SELECT COUNT(*) FROM card_assignments a JOIN visitor_registrations r ON r.id=a.registration_id WHERE a.closure_reason='LOST' AND a.closed_at>=? AND a.closed_at<?"+assignmentScope,assignmentPeriodArgs);
            add(sql,args,"inUse","SELECT COUNT(*) FROM card_assignments a JOIN visitor_registrations r ON r.id=a.registration_id WHERE a.closed_at IS NULL"+assignmentScope,assignmentCurrentArgs);
            var dueArgs=new ArrayList<Object>();dueArgs.add(DatabaseTime.sql(now));dueArgs.addAll(assignmentCurrentArgs);
            add(sql,args,"overdue","SELECT COUNT(*) FROM card_assignments a JOIN visitor_registrations r ON r.id=a.registration_id WHERE a.closed_at IS NULL AND a.due_at<=?"+assignmentScope,dueArgs);
            // Unassigned inventory has no ward. Only the category filter applies to these denominators.
            String cardScope=" AND environment=? AND data_origin='SIMULATED'"+(filter.categoryId()==null?"":" AND category_id=?");
            var cardArgs=new ArrayList<Object>();cardArgs.add(environment);if(filter.categoryId()!=null)cardArgs.add(filter.categoryId());
            add(sql,args,"available","SELECT COUNT(*) FROM cards WHERE status='AVAILABLE'"+cardScope,cardArgs);
            add(sql,args,"inventory","SELECT COUNT(*) FROM cards WHERE 1=1"+cardScope,cardArgs);
            add(sql,args,"issuedCards","SELECT COUNT(*) FROM cards WHERE status IN ('ISSUED','OVERDUE')"+cardScope,cardArgs);
            sql.add("SELECT 'category' metric,r.category_code label,COUNT(*) amount FROM visitor_registrations r WHERE r.submitted_at>=? AND r.submitted_at<?"+registrationScope+" GROUP BY r.category_code");args.addAll(registrationArgs(filter,true));
            // UTC DATETIME plus eight hours yields MYT without depending on MySQL timezone tables.
            sql.add("SELECT 'day' metric,DATE_FORMAT(DATE_ADD(r.submitted_at,INTERVAL 8 HOUR),'%Y-%m-%d') label,COUNT(*) amount FROM visitor_registrations r WHERE r.submitted_at>=? AND r.submitted_at<?"+registrationScope+" GROUP BY label");args.addAll(registrationArgs(filter,true));
            var values=jdbc.query(String.join(" UNION ALL ",sql),(rs,n)->new Metric(rs.getString(1),rs.getString(2),rs.getLong(3)),args.toArray());
            return new Report(filter.from().toString(),filter.to().toString(),now,"Asia/Kuala_Lumpur","SYNTHETIC / SIMULATED · "+environment,values,rows(filter,51));
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
        var args=registrationArgs(filter,true);args.add(limit);
        return jdbc.query("SELECT r.public_reference,r.category_code,d.name,r.status,r.submitted_at FROM visitor_registrations r JOIN destinations d ON d.id=r.destination_id WHERE r.submitted_at>=? AND r.submitted_at<?"+registrationScope(filter)+" ORDER BY r.submitted_at,r.id LIMIT ?",
            (rs,n)->new ReportRow(rs.getString(1),"***",rs.getString(2),rs.getString(3),rs.getString(4),DatabaseTime.instant(rs.getObject(5,LocalDateTime.class))),args.toArray());
    }
    /** Reporting cannot cross the server-selected environment or relabel future physical/live rows as demonstration data. */
    private String registrationScope(ReportFilter filter){return " AND r.environment=? AND r.data_origin='SYNTHETIC'"+filter.scope("r");}
    /** Parameters follow date, deployment, category and ward placeholders; the deployment is never accepted from the browser. */
    private List<Object> registrationArgs(ReportFilter filter,boolean period){
        var args=new ArrayList<Object>();if(period){args.add(filter.start());args.add(filter.end());}args.add(environment);args.addAll(filter.scopeArgs());return args;
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
