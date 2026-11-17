package eduupm.hsaas.reporting;

import java.time.Clock;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import eduupm.hsaas.administration.AdminAccess;

/** Reports remain under the existing ADMIN session/CSRF surface; exports are deliberate audited POST actions. */
@RestController
@RequestMapping("/api/admin/reports")
public class ReportingController {
    private final ReportingService reports;private final Clock clock;private final VisitorReportService visitors;
    public ReportingController(ReportingService reports,Clock clock,VisitorReportService visitors){this.reports=reports;this.clock=clock;this.visitors=visitors;}
    /** Personal tables are explicit CSRF-protected views, with a separate bounded export of the full matching result. */
    @PostMapping("/tables") public VisitorReportService.Table table(@RequestParam MultiValueMap<String,String> parameters,@RequestBody VisitorReportService.Request input,HttpServletRequest request,HttpServletResponse response){
        return visitors.table(AdminAccess.proof(request,response),ReportFilter.parse(parameters,clock),input);
    }
    @PostMapping("/table-exports") public ReportingService.Export tableExport(@RequestParam MultiValueMap<String,String> parameters,@RequestBody VisitorReportService.Request input,HttpServletRequest request,HttpServletResponse response){
        return visitors.export(AdminAccess.proof(request,response),ReportFilter.parse(parameters,clock),input);
    }
    @GetMapping public ReportingService.Report report(@RequestParam MultiValueMap<String,String> parameters,HttpServletRequest request,HttpServletResponse response){
        var proof=AdminAccess.proof(request,response);return reports.report(proof,ReportFilter.parse(parameters,clock));
    }
    /** No CSV leaves the service if its transaction/audit commit fails. An uncertain response can leave an export audit without download. */
    @PostMapping("/exports") public ReportingService.Export export(@RequestParam MultiValueMap<String,String> parameters,HttpServletRequest request,HttpServletResponse response){
        var proof=AdminAccess.proof(request,response);return reports.export(proof,ReportFilter.parse(parameters,clock));
    }
    @PostMapping("/compiled-exports") public ReportingService.Export compiled(@RequestParam MultiValueMap<String,String> parameters,HttpServletRequest request,HttpServletResponse response){
        return visitors.export(AdminAccess.proof(request,response),ReportFilter.parse(parameters,clock),new VisitorReportService.Request("PASSES",0,null));
    }
    @PostMapping("/chart-exports") public ReportingService.ChartReceipt charts(@RequestParam MultiValueMap<String,String> parameters,@RequestBody ReportingService.ChartRequest input,HttpServletRequest request,HttpServletResponse response){
        return reports.chartExport(AdminAccess.proof(request,response),ReportFilter.parse(parameters,clock),input);
    }
    /** Pass-level metadata uses the same ADMIN proof, MYT filters, CSRF and committed export audit as registrations. */
    @PostMapping("/pass-exports") public ReportingService.Export exportPasses(@RequestParam MultiValueMap<String,String> parameters,HttpServletRequest request,HttpServletResponse response){
        var proof=AdminAccess.proof(request,response);return reports.exportPasses(proof,ReportFilter.parse(parameters,clock));
    }
}
