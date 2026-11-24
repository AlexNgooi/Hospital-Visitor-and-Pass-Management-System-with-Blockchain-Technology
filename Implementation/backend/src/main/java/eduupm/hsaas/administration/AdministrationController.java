package eduupm.hsaas.administration;

import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.*;
import eduupm.hsaas.administration.AdministrationService.*;

/** Administrator-only JSON adapters keep CSRF/session protection and never bind an actor or authority from the client. */
@RestController
@RequestMapping("/api/admin")
public class AdministrationController {
    private final AdministrationService service;
    public AdministrationController(AdministrationService service){this.service=service;}
    @GetMapping("/users") public List<UserView> users(HttpServletRequest request,HttpServletResponse response){return service.users(AdminAccess.proof(request,response));}
    @PostMapping("/users") public Delivery create(@RequestBody CreateUser input,HttpServletRequest request,HttpServletResponse response){return service.create(AdminAccess.proof(request,response),input);}
    /** Readiness is protected and never exposes SMTP configuration or credentials. */
    @GetMapping("/staff-email") public Map<String,Boolean> staffEmail(HttpServletRequest request,HttpServletResponse response){return Map.of("configured",service.emailConfigured(AdminAccess.proof(request,response)));}
    @PostMapping("/users/{id}/initial-email") public Delivery resend(@PathVariable String id,@RequestBody Resend input,HttpServletRequest request,HttpServletResponse response){return service.resend(AdminAccess.proof(request,response),id,input);}
    @PatchMapping("/users/{id}") public Map<String,Boolean> update(@PathVariable String id,@RequestBody UserChange input,HttpServletRequest request,HttpServletResponse response){service.update(AdminAccess.proof(request,response),id,input);return Map.of("saved",true);}
    @PatchMapping("/users/{id}/staff-access") public Map<String,Boolean> permission(@PathVariable String id,@RequestBody StaffAccessInput input,HttpServletRequest request,HttpServletResponse response){service.staffAccess(AdminAccess.proof(request,response),id,input);return Map.of("saved",true);}
    @GetMapping("/{kind:categories|destinations}") public List<Reference> references(@PathVariable String kind,HttpServletRequest request,HttpServletResponse response){return service.references(AdminAccess.proof(request,response),kind);}
    @PostMapping("/destinations") public Map<String,Boolean> createReference(@RequestBody ReferenceCreate input,HttpServletRequest request,HttpServletResponse response){service.createReference(AdminAccess.proof(request,response),input);return Map.of("saved",true);}
    @PatchMapping("/{kind:categories|destinations}/{id}") public Map<String,Boolean> reference(@PathVariable String kind,@PathVariable String id,@RequestBody ReferenceChange input,HttpServletRequest request,HttpServletResponse response){service.reference(AdminAccess.proof(request,response),kind,id,input);return Map.of("saved",true);}
    @GetMapping("/settings") public List<Setting> settings(HttpServletRequest request,HttpServletResponse response){return service.settings(AdminAccess.proof(request,response));}
    /** Parse the explicit nullable choice before mutation; omission must never silently remove future deadlines. */
    @PatchMapping("/settings/{id}") public Map<String,Boolean> setting(@PathVariable String id,@RequestBody String input,HttpServletRequest request,HttpServletResponse response){service.setting(AdminAccess.proof(request,response),id,input);return Map.of("saved",true);}
}
