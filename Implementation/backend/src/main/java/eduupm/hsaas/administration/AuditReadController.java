package eduupm.hsaas.administration;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

/** Read-only local audit is administrator-scoped; no unavailable proof or notification action is offered. */
@RestController
public class AuditReadController {
    private final AuditReadService service;
    public AuditReadController(AuditReadService service){this.service=service;}
    @GetMapping("/api/admin/audit-events") public AuditReadService.Page events(@RequestParam MultiValueMap<String,String> parameters,HttpServletRequest request,HttpServletResponse response){return service.read(AdminAccess.proof(request,response),parameters);}
}
