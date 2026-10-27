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
import eduupm.hsaas.administration.AdminInputs;
import eduupm.hsaas.auth.AccountChanges.Proof;
import eduupm.hsaas.common.*;
import eduupm.hsaas.config.FoundationProperties;

/** ADMIN-only masked read model separates registration counts, pass activity and current inventory. */
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

    /** One UNION statement snapshots all aggregates; previews follow it and can include concurrent committed activity. */
    public Report report(Proof proof,ReportFilter filter){
        return tx.execute(status->{access.require(proof);Instant now=clock.instant();validateReferences(filter);
            var sql=new ArrayList<String>();var args=new ArrayList<Object>();
            String registrations=" FROM visitor_registrations r WHERE ";
            String assignments=" FROM card_assignments a JOIN visitor_registrations r ON r.id=a.registration_id WHERE ";
            add(sql,args,"visits","SELECT COUNT(*)"+registrations+"r.submitted_at>=? AND r.submitted_at<?"+registrationScope(filter),registrationArgs(filter,true));
            add(sql,args,"issued","SELECT COUNT(*)"+assignments+"a.issued_at>=? AND a.issued_at<?"+assignmentScope(filter),assignmentArgs(filter,true));
            add(sql,args,"issuedRegistrations","SELECT COUNT(DISTINCT a.registration_id)"+assignments+"a.issued_at>=? AND a.issued_at<?"+assignmentScope(filter),assignmentArgs(filter,true));
            add(sql,args,"returned","SELECT COUNT(*)"+assignments+"a.closure_reason='RETURNED' AND a.returned_at>=? AND a.returned_at<?"+assignmentScope(filter),assignmentArgs(filter,true));
            add(sql,args,"lost","SELECT COUNT(*)"+assignments+"a.closure_reason='LOST' AND a.closed_at>=? AND a.closed_at<?"+assignmentScope(filter),assignmentArgs(filter,true));
            add(sql,args,"inUse","SELECT COUNT(*)"+assignments+"a.closed_at IS NULL"+assignmentScope(filter),assignmentArgs(filter,false));
            add(sql,args,"openRegistrations","SELECT COUNT(DISTINCT a.registration_id)"+assignments+"a.closed_at IS NULL"+assignmentScope(filter),assignmentArgs(filter,false));
            add(sql,args,"noDeadline","SELECT COUNT(*)"+assignments+"a.closed_at IS NULL AND a.due_at IS NULL"+assignmentScope(filter),assignmentArgs(filter,false));
            var dueArgs=new ArrayList<Object>();dueArgs.add(DatabaseTime.sql(now));dueArgs.addAll(assignmentArgs(filter,false));
            add(sql,args,"overdue","SELECT COUNT(*)"+assignments+"a.closed_at IS NULL AND a.due_at IS NOT NULL AND a.due_at<=?"+assignmentScope(filter),dueArgs);
            // Inventory intentionally ignores the selected assignment destination, including destination-bound manual cards.
            String cardScope=" AND environment=? AND ((enrollment_method='SCAN' AND data_origin='SIMULATED') OR (enrollment_method='MANUAL' AND data_origin='SYNTHETIC'))"+(filter.categoryId()==null?"":" AND category_id=?");
            var cardArgs=new ArrayList<Object>();cardArgs.add(environment);if(filter.categoryId()!=null)cardArgs.add(filter.categoryId());
            add(sql,args,"available","SELECT COUNT(*) FROM cards WHERE status='AVAILABLE'"+cardScope,cardArgs);
            add(sql,args,"inventory","SELECT COUNT(*) FROM cards WHERE 1=1"+cardScope,cardArgs);
            add(sql,args,"issuedCards","SELECT COUNT(*) FROM cards WHERE status IN ('ISSUED','OVERDUE')"+cardScope,cardArgs);
            sql.add("SELECT 'category' metric,r.category_code label,COUNT(*) amount"+registrations+"r.submitted_at>=? AND r.submitted_at<?"+registrationScope(filter)+" GROUP BY r.category_code");args.addAll(registrationArgs(filter,true));
            // UTC DATETIME plus eight hours avoids relying on MySQL timezone-table installation.
            sql.add("SELECT 'day' metric,DATE_FORMAT(DATE_ADD(r.submitted_at,INTERVAL 8 HOUR),'%Y-%m-%d') label,COUNT(*) amount"+registrations+"r.submitted_at>=? AND r.submitted_at<?"+registrationScope(filter)+" GROUP BY label");args.addAll(registrationArgs(filter,true));
            var values=jdbc.query(String.join(" UNION ALL ",sql),(rs,n)->new Metric(rs.getString(1),rs.getString(2),rs.getLong(3)),args.toArray());
            return new Report(filter.from().toString(),filter.to().toString(),now,"Asia/Kuala_Lumpur","SYNTHETIC / legacy SIMULATED · "+environment,values,rows(filter,51),passRows(filter,51,now));
        });
    }

    /** Retains the original registration export surface; selecting a new pass export is always a deliberate POST. */
    public Export export(Proof proof,ReportFilter filter){return export(proof,filter,false);}

    /** Both export kinds commit their audit before returning; limits reject complete exports instead of truncating them. */
    public Export exportPasses(Proof proof,ReportFilter filter){return export(proof,filter,true);}

    private Export export(Proof proof,ReportFilter filter,boolean passes){
        return tx.execute(status->{var actor=access.require(proof);validateReferences(filter);Instant now=clock.instant();
            String kind=passes?"PASSES":"REGISTRATIONS";int count;var body=new StringBuilder("\uFEFF");
            if(passes){
                var items=passRows(filter,10001,now);count=items.size();requireExportCount(count);
                body.append(PassReportRow.header());for(var row:items)body.append(row.csv());
            }else{
                var items=rows(filter,10001);count=items.size();requireExportCount(count);
                body.append(CsvSafety.row("Reference","Visitor (masked)","Category","Requested wards / destinations","Registration status","Submitted (MYT)"));
                for(var row:items)body.append(CsvSafety.row(row.reference(),row.visitor(),row.category(),row.destination(),row.status(),DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(row.submittedAt().atZone(ReportFilter.MYT))));
            }
            String id=UUID.randomUUID().toString();
            var result=new Export(id,"hsaas-"+(passes?"passes":"masked")+"-"+filter.from()+"-"+filter.to()+".csv",body.toString(),count,now);
            // Escaped JSON can exceed CSV bytes substantially; leave margin below the shared client's 1 MiB limit.
            if(json.writeValueAsString(result).getBytes(java.nio.charset.StandardCharsets.UTF_8).length>1047552)throw new ApiFailure(422,"EXPORT_TOO_LARGE","Narrow the report range.");
            jdbc.update("INSERT INTO report_exports(id,actor_id,from_date,to_date,category_id,destination_id,created_at,row_count) VALUES(?,?,?,?,?,?,?,?)",id,actor.id(),filter.from(),filter.to(),filter.categoryId(),filter.destinationId(),DatabaseTime.sql(now),count);
            audit.append(LocalAuditPort.Action.REPORT_EXPORTED,"REPORT_EXPORT",id,actor.id(),new LocalAuditPort.Snapshot(null,"EXPORTED",null,0L,"LOCAL"));
            // This explicit whitelist distinguishes exports without storing CSV, reference lists or visitor/patient fields.
            var snapshot=new LinkedHashMap<String,Object>();snapshot.put("exportKind",kind);snapshot.put("rowCount",count);
            snapshot.put("from",filter.from().toString());snapshot.put("to",filter.to().toString());
            snapshot.put("categoryId",filter.categoryId()==null?null:filter.categoryId().toString());snapshot.put("destinationId",filter.destinationId()==null?null:filter.destinationId().toString());
            jdbc.update("INSERT INTO administration_history(entity_kind,entity_id,version,current_value,reason_code,actor_id,changed_at) VALUES('EXPORT',?,0,?,'REPORT_EXPORT',?,?)",id,json.writeValueAsString(snapshot),actor.id(),DatabaseTime.sql(now));
            return result;
        });
    }

    /** Bounds are checked before CSV construction and before any export/audit row is inserted. */
    private void requireExportCount(int count){if(count>10000)throw new ApiFailure(422,"EXPORT_TOO_LARGE","Narrow the report range to at most 10000 rows.");}

    /** Correlated JSON aggregation avoids count fan-out and GROUP_CONCAT's silent label truncation. No form_data is read. */
    private List<ReportRow> rows(ReportFilter filter,int limit){
        var args=registrationArgs(filter,true);args.add(limit);
        return jdbc.query("SELECT r.public_reference,r.category_code,(SELECT JSON_ARRAYAGG(d.name) FROM registration_destinations rd JOIN destinations d ON d.id=rd.destination_id WHERE rd.registration_id=r.id) requested_destinations,r.status,r.submitted_at FROM visitor_registrations r WHERE r.submitted_at>=? AND r.submitted_at<?"+registrationScope(filter)+" ORDER BY r.submitted_at,r.id LIMIT ?",
            (rs,n)->new ReportRow(rs.getString(1),"***",rs.getString(2),destinationLabels(rs.getString(3)),rs.getString(4),DatabaseTime.instant(rs.getObject(5,LocalDateTime.class))),args.toArray());
    }

    /** An assignment appears once when any agreed activity timestamp matches; lost closure is never an actual return. */
    private List<PassReportRow> passRows(ReportFilter filter,int limit,Instant now){
        var args=new ArrayList<Object>();args.add(DatabaseTime.sql(now));
        for(int i=0;i<3;i++){args.add(filter.start());args.add(filter.end());}args.addAll(assignmentArgs(filter,false));args.add(limit);
        String destination="CASE WHEN a.operation_origin='SIMULATED' AND a.destination_id IS NULL THEN legacy.name ELSE a.destination_name END";
        return jdbc.query("SELECT r.public_reference,a.pass_reference,c.card_code,r.category_code,"+destination+",CASE WHEN a.closure_reason='RETURNED' THEN 'RETURNED' WHEN a.closure_reason='LOST' THEN 'LOST' WHEN a.due_at IS NOT NULL AND a.due_at<=? THEN 'OVERDUE' ELSE 'OPEN' END,a.issued_at,a.issued_by,a.due_at,a.returned_at,a.returned_by,a.closed_at,a.closed_by,a.operation_origin,a.data_origin FROM card_assignments a JOIN visitor_registrations r ON r.id=a.registration_id JOIN cards c ON c.id=a.card_id JOIN destinations legacy ON legacy.id=r.destination_id WHERE ((a.issued_at>=? AND a.issued_at<?) OR (a.closure_reason='RETURNED' AND a.returned_at>=? AND a.returned_at<?) OR (a.closure_reason='LOST' AND a.closed_at>=? AND a.closed_at<?))"+assignmentScope(filter)+" ORDER BY a.issued_at,a.id LIMIT ?",
            (rs,n)->new PassReportRow(rs.getString(1),rs.getString(2),rs.getString(3),rs.getString(4),referenceLabel(rs.getString(5)),rs.getString(6),DatabaseTime.instant(rs.getObject(7,LocalDateTime.class)),rs.getString(8),DatabaseTime.instant(rs.getObject(9,LocalDateTime.class)),DatabaseTime.instant(rs.getObject(10,LocalDateTime.class)),rs.getString(11),DatabaseTime.instant(rs.getObject(12,LocalDateTime.class)),rs.getString(13),"SIMULATED".equals(rs.getString(14))?"SCAN (legacy)":"MANUAL",rs.getString(15)),args.toArray());
    }

    /** V8 backfills old singleton destinations. Missing new relation data fails explicitly instead of inventing a location. */
    private String destinationLabels(String encoded){
        if(encoded==null)throw new ApiFailure(503,"REPORT_DATA_UNAVAILABLE","Registration destinations are unavailable.");
        var names=json.readTree(encoded);if(!names.isArray() || names.isEmpty())throw new ApiFailure(503,"REPORT_DATA_UNAVAILABLE","Registration destinations are unavailable.");
        return names.valueStream().map(value->referenceLabel(value.isString()?value.asString():null)).sorted().collect(java.util.stream.Collectors.joining("; "));
    }

    /** Reference labels retain the existing bounded text whitelist; broken stored labels produce a safe read failure. */
    private String referenceLabel(String label){
        try{return AdminInputs.name(label);}catch(ApiFailure failure){throw new ApiFailure(503,"REPORT_DATA_UNAVAILABLE","Report destination labels are unavailable.");}
    }

    /** The deployment and synthetic provenance are server-selected, never supplied by a query parameter. */
    private String registrationScope(ReportFilter filter){return " AND r.environment=? AND r.data_origin='SYNTHETIC'"+filter.scope("r");}

    /** Only approved historical scan and new manual/source pairs are visible; actual pass destination drives this filter. */
    private String assignmentScope(ReportFilter filter){
        return " AND r.environment=? AND r.data_origin='SYNTHETIC' AND a.environment=? AND ((a.operation_origin='SIMULATED' AND a.data_origin='SIMULATED') OR (a.operation_origin='MANUAL' AND a.data_origin='SYNTHETIC'))"
                +(filter.categoryId()==null?"":" AND r.category_id=?")
                +(filter.destinationId()==null?"":" AND (a.destination_id=? OR (a.operation_origin='SIMULATED' AND a.destination_id IS NULL AND r.destination_id=?))");
    }

    /** Parameters follow the corresponding SQL predicate order; EXISTS never multiplies registration rows. */
    private List<Object> registrationArgs(ReportFilter filter,boolean period){
        var args=new ArrayList<Object>();if(period){args.add(filter.start());args.add(filter.end());}args.add(environment);args.addAll(filter.scopeArgs());return args;
    }

    /** Pass scope deliberately does not reuse requested-registration destination filters. */
    private List<Object> assignmentArgs(ReportFilter filter,boolean period){
        var args=new ArrayList<Object>();if(period){args.add(filter.start());args.add(filter.end());}args.add(environment);args.add(environment);
        if(filter.categoryId()!=null)args.add(filter.categoryId());if(filter.destinationId()!=null){args.add(filter.destinationId());args.add(filter.destinationId());}return args;
    }

    /** Inactive references remain valid historical filters; unknown IDs are rejected rather than silently broadened. */
    private void validateReferences(ReportFilter filter){
        if(filter.categoryId()!=null&&jdbc.queryForObject("SELECT COUNT(*) FROM visitor_categories WHERE id=?",Integer.class,filter.categoryId())!=1)throw new ApiFailure(400,"VALIDATION_FAILED","Unknown category.");
        if(filter.destinationId()!=null&&jdbc.queryForObject("SELECT COUNT(*) FROM destinations WHERE id=?",Integer.class,filter.destinationId())!=1)throw new ApiFailure(400,"VALIDATION_FAILED","Unknown destination.");
    }

    /** Metric names and SQL fragments are fixed by service code; all filter values are bound parameters. */
    private void add(List<String> sql,List<Object> args,String key,String query,List<Object> parameters){sql.add("SELECT '"+key+"' metric,'' label,("+query+") amount");args.addAll(parameters);}
    public record Metric(String metric,String label,long amount){}
    public record ReportRow(String reference,String visitor,String category,String destination,String status,Instant submittedAt){}
    public record Report(String from,String to,Instant serverUpdatedAt,String timezone,String origin,List<Metric> metrics,List<ReportRow> preview,List<PassReportRow> passPreview){}
    /** A bounded JSON envelope uses the existing CSRF client and never adds a second unaudited download GET. */
    public record Export(String id,String filename,String csv,int rowCount,Instant serverUpdatedAt){}
}
