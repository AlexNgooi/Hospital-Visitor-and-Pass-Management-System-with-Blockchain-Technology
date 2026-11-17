package eduupm.hsaas.reporting;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;
import eduupm.hsaas.administration.AdminAccess;
import eduupm.hsaas.administration.AdminInputs;
import eduupm.hsaas.auth.AccountChanges.Proof;
import eduupm.hsaas.common.*;
import eduupm.hsaas.config.FoundationProperties;
import eduupm.hsaas.registration.RegistrationReportingPort;

/** Explicit admin views and exports disclose visitor names only; patient/contact/identity fields never cross this boundary. */
@Service
public class VisitorReportService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final AdminAccess access;
    private final LocalAuditPort audit;
    private final ObjectProvider<RegistrationReportingPort> roots;
    private final ReportingService reports;
    private final JsonMapper json;
    private final Clock clock;
    private final String environment;

    public VisitorReportService(JdbcTemplate jdbc,TransactionTemplate template,AdminAccess access,LocalAuditPort audit,
            ObjectProvider<RegistrationReportingPort> roots,ReportingService reports,JsonMapper json,Clock clock,FoundationProperties properties) {
        this.jdbc=jdbc;this.tx=new TransactionTemplate(template.getTransactionManager());
        this.tx.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        this.access=access;this.audit=audit;this.roots=roots;this.reports=reports;this.json=json;this.clock=clock;this.environment=properties.environment();
    }

    /** No polling of personal views: a deliberate CSRF POST rechecks authority and commits a field-free read audit. */
    public Table table(Proof proof,ReportFilter filter,Request input) {
        validate(input,false);
        return tx.execute(status->{
            var actor=access.require(proof); validateReferences(filter);
            var rows=rows(proof,filter,input,51,input.page()*50);
            var result=new Table(input.kind(),columns(input.kind()),rows.stream().limit(50).toList(),rows.size()>50,input.page(),clock.instant());
            audit.append(LocalAuditPort.Action.REPORT_VIEWED,"REPORT_EXPORT",UUID.randomUUID().toString(),actor.id(),
                    new LocalAuditPort.Snapshot(null,null,null,null,"LOCAL"));
            return result;
        });
    }

    /** Each CSV has one grain, every matching row, an explicit date basis and an all-or-error response bound. */
    public ReportingService.Export export(Proof proof,ReportFilter filter,Request input) {
        validate(input,true);
        return tx.execute(status->{
            var actor=access.require(proof);validateReferences(filter);
            var rows=rows(proof,filter,input,10001,0);
            if(rows.size()>10000)throw new ApiFailure(422,"EXPORT_TOO_LARGE","Narrow the report to at most 10000 rows.");
            var columns=columns(input.kind());var body=new StringBuilder("\uFEFF");
            body.append(CsvSafety.row(columns.stream().map(Column::label).toArray(String[]::new)));
            for(var row:rows)body.append(CsvSafety.row(columns.stream().map(column->csvValue(column.key(),row.get(column.key()))).toArray(String[]::new)));
            Instant now=clock.instant();String id=UUID.randomUUID().toString();
            var result=new ReportingService.Export(id,"hsaas-"+input.kind().toLowerCase(Locale.ROOT)+"-"+filter.from()+"-"+filter.to()+".csv",body.toString(),rows.size(),now);
            if(json.writeValueAsString(result).getBytes(java.nio.charset.StandardCharsets.UTF_8).length>1047552)
                throw new ApiFailure(422,"EXPORT_TOO_LARGE","Narrow the report range; no partial export was produced.");
            jdbc.update("INSERT INTO report_exports(id,actor_id,from_date,to_date,category_id,destination_id,created_at,row_count) VALUES(?,?,?,?,?,?,?,?)",
                    id,actor.id(),filter.from(),filter.to(),filter.categoryId(),filter.destinationId(),DatabaseTime.sql(now),rows.size());
            audit.append(LocalAuditPort.Action.REPORT_EXPORTED,"REPORT_EXPORT",id,actor.id(),new LocalAuditPort.Snapshot(null,"EXPORTED",null,0L,"LOCAL"));
            var scope=new LinkedHashMap<String,Object>();scope.put("exportKind",input.kind());scope.put("rowCount",rows.size());scope.put("from",filter.from().toString());scope.put("to",filter.to().toString());
            scope.put("categoryId",filter.categoryId());scope.put("destinationId",filter.destinationId());
            jdbc.update("INSERT INTO administration_history(entity_kind,entity_id,version,current_value,reason_code,actor_id,changed_at) VALUES('EXPORT',?,0,?,'REPORT_EXPORT',?,?)",
                    id,json.writeValueAsString(scope),actor.id(),DatabaseTime.sql(now));
            return result;
        });
    }

    private void validate(Request input,boolean export) {
        if(input==null || input.kind()==null || !Set.of("REGISTRATIONS","PASSES","ACTIVITIES","SUMMARY").contains(input.kind())
                || input.page()<0 || input.page()>1000 || export && (input.page()!=0 || input.registrationId()!=null))throw AdminInputs.invalid();
        if(input.registrationId()!=null && !input.kind().equals("ACTIVITIES"))throw AdminInputs.invalid();
        if(input.registrationId()!=null)AdminInputs.id(input.registrationId());
    }

    /** Destination labels are immutable snapshots; EXISTS scopes never multiply a visitor or loan. */
    private List<Map<String,String>> rows(Proof proof,ReportFilter filter,Request input,int limit,int offset) {
        if(input.kind().equals("SUMMARY"))return reports.report(proof,filter).metrics().stream().map(metric->{
            Map<String,String> row=new LinkedHashMap<>();row.put("metric",metric.metric());row.put("group",metric.label());row.put("count",Long.toString(metric.amount()));row.put("from",filter.from().toString());row.put("to",filter.to().toString());
            row.put("basis",Set.of("inUse","overdue","noDeadline","openRegistrations","available","inventory","issuedCards","lostCards","disabledCards").contains(metric.metric())?"Current snapshot (inventory ignores destination)":"Selected MYT period");return row;
        }).skip(offset).limit(limit).toList();
        String locations="(SELECT JSON_ARRAYAGG(rd.destination_name) FROM registration_destinations rd WHERE rd.registration_id=r.id)";
        String source=" AND r.environment=? AND r.data_origin='SYNTHETIC'"+filter.scope("r");
        var args=new ArrayList<Object>();String sql;
        if(input.kind().equals("REGISTRATIONS")) {
            // Pass counts deliberately share the registration environment and exact supported provenance pairs.
            String loans=" FROM card_assignments a WHERE a.registration_id=r.id AND a.environment=r.environment AND "+assignmentSource();
            sql="SELECT r.id registrationId,r.public_reference reference,r.category_code category,"+locations+" destination,r.status status,r.submitted_at submittedAt,"
                +"(SELECT COUNT(*)"+loans+") passCount,(SELECT COUNT(*)"+loans+" AND a.closed_at IS NULL) activePassCount,"
                +"CASE WHEN EXISTS(SELECT 1 FROM audit_events e WHERE e.target_ref=CONCAT('REGISTRATION:',r.id) AND e.action='REGISTRATION_NO_PASS') THEN 'Yes' ELSE 'No' END noPassRecorded"
                +" FROM visitor_registrations r WHERE r.submitted_at>=? AND r.submitted_at<?"+source+" ORDER BY r.submitted_at DESC,r.id DESC LIMIT ? OFFSET ?";
            args.add(filter.start());args.add(filter.end());args.add(environment);args.addAll(filter.scopeArgs());
        } else if(input.kind().equals("PASSES")) {
            sql="SELECT r.id registrationId,r.public_reference reference,r.category_code category,c.card_code cardCode,a.pass_reference loanReference,"
                +"CASE WHEN a.destination_scope='REGISTRATION' THEN (SELECT JSON_ARRAYAGG(ad.destination_name) FROM assignment_destinations ad WHERE ad.assignment_id=a.id) ELSE JSON_ARRAY(COALESCE(a.destination_name,(SELECT rd.destination_name FROM registration_destinations rd WHERE rd.registration_id=r.id AND rd.destination_id=r.destination_id))) END destination,"
                +"CASE WHEN a.destination_scope='REGISTRATION' THEN 'Registered destinations' ELSE 'Legacy issued destination' END destinationBasis,"
                +"CASE WHEN a.closure_reason='RETURNED' THEN 'Returned' WHEN a.closure_reason='LOST' THEN 'Lost' WHEN a.due_at IS NOT NULL AND a.due_at<=? THEN 'Overdue' ELSE 'Issued' END status,"
                +"a.issued_at issuedAt,COALESCE(NULLIF(issuer.full_name,''),issuer.login) issuedBy,a.due_at dueAt,a.returned_at returnedAt,COALESCE(NULLIF(receiver.full_name,''),receiver.login,'') returnedBy,"
                +"a.closed_at closedAt,COALESCE(NULLIF(closer.full_name,''),closer.login,'') closedBy"
                +" FROM card_assignments a JOIN visitor_registrations r ON r.id=a.registration_id JOIN cards c ON c.id=a.card_id JOIN destinations d ON d.id=r.destination_id"
                +" JOIN users issuer ON issuer.id=a.issued_by LEFT JOIN users receiver ON receiver.id=a.returned_by LEFT JOIN users closer ON closer.id=a.closed_by"
                +" WHERE a.issued_at>=? AND a.issued_at<?"+source+" AND a.environment=? AND c.environment=? AND "+assignmentSource()+" AND "+cardSource()
                +" ORDER BY a.issued_at DESC,a.id DESC LIMIT ? OFFSET ?";
            args.add(DatabaseTime.sql(clock.instant()));args.add(filter.start());args.add(filter.end());args.add(environment);args.addAll(filter.scopeArgs());args.add(environment);args.add(environment);
        } else {
            // The registration audit supplies No pass even with zero assignments; lifecycle events supply individual cards.
            String events="SELECT e.event_id id,CAST(SUBSTRING(e.target_ref,14) AS UNSIGNED) registration_id,e.action event,e.occurred_at,e.actor_id,NULL card_code FROM audit_events e"
                +" WHERE e.target_ref LIKE 'REGISTRATION:%' AND e.action IN ('REGISTRATION_SUBMITTED','REGISTRATION_VERIFIED','REGISTRATION_REJECTED','REGISTRATION_NO_PASS')"
                +" UNION ALL SELECT e.id,COALESCE(e.registration_id,a.registration_id),e.event_type,e.occurred_at,e.actor_id,c.card_code FROM lifecycle_events e"
                +" JOIN cards c ON c.id=e.card_id LEFT JOIN card_assignments a ON a.id=e.assignment_id WHERE c.environment=? AND "+cardSource()
                +" AND e.event_type IN ('ISSUED','RETURNED','MARKED_LOST','OVERDUE') AND a.environment=? AND "+assignmentSource();
            sql="SELECT r.id registrationId,r.public_reference reference,r.category_code category,"+locations+" destination,e.event event,e.occurred_at occurredAt,COALESCE(e.card_code,'') cardCode,"
                +"COALESCE(NULLIF(u.full_name,''),u.login,'System') actor FROM ("+events+") e JOIN visitor_registrations r ON r.id=e.registration_id LEFT JOIN users u ON u.id=e.actor_id WHERE 1=1";
            args.add(environment);args.add(environment);
            if(input.registrationId()==null) {sql+=" AND e.occurred_at>=? AND e.occurred_at<?";args.add(filter.start());args.add(filter.end());}
            else {sql+=" AND r.id=?";args.add(AdminInputs.id(input.registrationId()));}
            sql+=source+" ORDER BY e.occurred_at DESC,e.id DESC LIMIT ? OFFSET ?";args.add(environment);args.addAll(filter.scopeArgs());
        }
        args.add(limit);args.add(offset);
        var values=jdbc.query(sql,(rs,n)->{
            Map<String,String> row=new LinkedHashMap<>();var metadata=rs.getMetaData();
            for(int column=1;column<=metadata.getColumnCount();column++) {
                String key=metadata.getColumnLabel(column),value;
                if(key.endsWith("At")){var time=DatabaseTime.instant(rs.getObject(column,LocalDateTime.class));value=time==null?"":time.toString();}
                else value=Objects.toString(rs.getString(column),"");
                if(key.equals("destination"))value=locations(value);
                row.put(key,value);
            }
            return row;
        },args.toArray());
        var ids=values.stream().map(row->row.get("registrationId")).distinct().toList();var names=new HashMap<String,String>();
        var root=roots.getIfAvailable();if(root==null)throw new ApiFailure(503,"REPORT_DATA_UNAVAILABLE","Visitor names are unavailable.");
        for(int start=0;start<ids.size();start+=200)names.putAll(root.reportNames(proof,environment,ids.subList(start,Math.min(start+200,ids.size()))));
        for(var row:values){String name=names.get(row.get("registrationId"));if(name==null)throw new ApiFailure(503,"REPORT_DATA_UNAVAILABLE","Visitor names are unavailable.");row.put("visitor",name);}
        return values;
    }

    private static String assignmentSource(){return "((a.operation_origin='MANUAL' AND a.data_origin='SYNTHETIC') OR (a.operation_origin='SIMULATED' AND a.data_origin='SIMULATED'))";}
    private static String cardSource(){return "((c.enrollment_method='MANUAL' AND c.data_origin='SYNTHETIC') OR (c.enrollment_method='SCAN' AND c.data_origin='SIMULATED'))";}
    private String locations(String encoded) {
        if(encoded.isEmpty())throw new ApiFailure(503,"REPORT_DATA_UNAVAILABLE","Destination snapshots are unavailable.");
        var names=json.readTree(encoded);if(!names.isArray() || names.isEmpty())throw new ApiFailure(503,"REPORT_DATA_UNAVAILABLE","Destination snapshots are unavailable.");
        return names.valueStream().map(value->AdminInputs.name(value.asString())).sorted().collect(java.util.stream.Collectors.joining("; "));
    }
    private void validateReferences(ReportFilter filter) {
        if(filter.categoryId()!=null && jdbc.queryForObject("SELECT COUNT(*) FROM visitor_categories WHERE id=?",Integer.class,filter.categoryId())!=1)throw AdminInputs.invalid();
        if(filter.destinationId()!=null && jdbc.queryForObject("SELECT COUNT(*) FROM destinations WHERE id=?",Integer.class,filter.destinationId())!=1)throw AdminInputs.invalid();
    }
    private static String csvValue(String key,String value) {
        if(key.endsWith("At") && value!=null && !value.isEmpty())return DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(Instant.parse(value).atZone(ReportFilter.MYT));
        if(key.equals("dueAt") && (value==null || value.isEmpty()))return "No deadline";
        if(key.equals("returnedAt") && (value==null || value.isEmpty()))return "Not returned";
        if(key.equals("event")) return switch(Objects.toString(value,"")) {
            case "REGISTRATION_SUBMITTED" -> "Registered"; case "REGISTRATION_VERIFIED" -> "Approved";
            case "REGISTRATION_REJECTED" -> "Rejected"; case "REGISTRATION_NO_PASS" -> "No pass recorded";
            case "ISSUED" -> "Pass issued"; case "RETURNED" -> "Pass returned";
            case "MARKED_LOST" -> "Pass marked lost"; case "OVERDUE" -> "Pass overdue"; default -> Objects.toString(value,"");
        };
        if(key.equals("category") || key.equals("group")) return switch(Objects.toString(value,"")) {
            case "EXECUTIVE" -> "Executive"; case "PENJAGA" -> "Penjaga"; case "VENDOR" -> "Vendor"; case "CONTRACTOR" -> "Contractor"; default -> Objects.toString(value,"");
        };
        if(key.equals("metric")) return switch(Objects.toString(value,"")) {
            case "visits" -> "Registrations"; case "issued" -> "Passes issued"; case "issuedRegistrations" -> "Registrations issued passes";
            case "returned" -> "Passes actually returned"; case "lost" -> "Loans closed lost"; case "inUse" -> "Unreturned passes";
            case "openRegistrations" -> "Registrations with unreturned passes"; case "noDeadline" -> "Unreturned passes without a deadline";
            case "overdue" -> "Overdue passes"; case "available" -> "Available inventory"; case "inventory" -> "Total inventory";
            case "issuedCards" -> "Issued inventory"; case "lostCards" -> "Lost inventory"; case "disabledCards" -> "Disabled inventory";
            case "category" -> "Registrations by visitor type"; case "day" -> "Daily registrations"; case "dayIssued" -> "Daily pass issues";
            case "dayReturned" -> "Daily actual returns"; default -> Objects.toString(value,"");
        };
        return Objects.toString(value,"");
    }
    private static List<Column> columns(String kind) {
        return switch(kind) {
            case "REGISTRATIONS"->List.of(c("reference","Registration reference"),c("visitor","Visitor name"),c("category","Visitor type"),c("destination","Registered destinations"),c("submittedAt","Registered at (MYT)"),c("status","Review status"),c("passCount","Passes issued (all time)"),c("activePassCount","Unreturned passes (current)"),c("noPassRecorded","No pass recorded (history)"));
            case "PASSES"->List.of(c("cardCode","Pass code"),c("visitor","Visitor name / borrowing contact"),c("reference","Registration reference"),c("category","Visitor type"),c("destination","Destination snapshot"),c("destinationBasis","Destination basis"),c("issuedAt","Issued at (MYT; date filter basis)"),c("issuedBy","Issued by"),c("dueAt","Return deadline (MYT)"),c("returnedAt","Actually returned at (MYT)"),c("returnedBy","Returned by"),c("status","Current loan status"),c("closedAt","Closed at (MYT)"),c("closedBy","Closed by"),c("loanReference","Loan reference"));
            case "ACTIVITIES"->List.of(c("occurredAt","Activity at (MYT; date filter basis)"),c("visitor","Visitor name"),c("reference","Registration reference"),c("category","Visitor type"),c("event","Activity"),c("cardCode","Pass code"),c("destination","Registered destinations"),c("actor","Performed by"));
            default->List.of(c("metric","Metric"),c("group","Group"),c("count","Count"),c("from","Period from (MYT)"),c("to","Period to (MYT)"),c("basis","Counting basis"));
        };
    }
    private static Column c(String key,String label){return new Column(key,label);}
    public record Request(String kind,int page,String registrationId) { }
    public record Column(String key,String label) { }
    public record Table(String kind,List<Column> columns,List<Map<String,String>> rows,boolean more,int page,Instant serverUpdatedAt) {
        @Override public String toString(){return "VisitorReportTable[REDACTED]";}
    }
}
