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
    private final ReportingService reports;private final Clock clock;
    public ReportingController(ReportingService reports,Clock clock){this.reports=reports;this.clock=clock;}
    @GetMapping public ReportingService.Report report(@RequestParam MultiValueMap<String,String> parameters,HttpServletRequest request,HttpServletResponse response){
        var proof=AdminAccess.proof(request,response);return reports.report(proof,ReportFilter.parse(parameters,clock));
    }
    /** No CSV leaves the service if its transaction/audit commit fails. An uncertain response can leave an export audit without download. */
    @PostMapping("/exports") public ReportingService.Export export(@RequestParam MultiValueMap<String,String> parameters,HttpServletRequest request,HttpServletResponse response){
        var proof=AdminAccess.proof(request,response);return reports.export(proof,ReportFilter.parse(parameters,clock));
    }
}
