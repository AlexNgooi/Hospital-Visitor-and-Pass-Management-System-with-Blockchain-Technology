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
    @PostMapping("/users") public Map<String,Boolean> create(@RequestBody CreateUser input,HttpServletRequest request,HttpServletResponse response){service.create(AdminAccess.proof(request,response),input);return Map.of("saved",true);}
    @PatchMapping("/users/{id}") public Map<String,Boolean> update(@PathVariable String id,@RequestBody UserChange input,HttpServletRequest request,HttpServletResponse response){service.update(AdminAccess.proof(request,response),id,input);return Map.of("saved",true);}
    @PatchMapping("/users/{id}/counters/{counterId}") public Map<String,Boolean> permission(@PathVariable String id,@PathVariable String counterId,@RequestBody PermissionChange input,HttpServletRequest request,HttpServletResponse response){service.permission(AdminAccess.proof(request,response),id,counterId,input);return Map.of("saved",true);}
    @GetMapping("/{kind:categories|destinations|counters}") public List<Reference> references(@PathVariable String kind,HttpServletRequest request,HttpServletResponse response){return service.references(AdminAccess.proof(request,response),kind);}
    @PostMapping("/{kind:destinations|counters}") public Map<String,Boolean> createReference(@PathVariable String kind,@RequestBody ReferenceCreate input,HttpServletRequest request,HttpServletResponse response){service.createReference(AdminAccess.proof(request,response),kind,input);return Map.of("saved",true);}
    @PatchMapping("/{kind:categories|destinations|counters}/{id}") public Map<String,Boolean> reference(@PathVariable String kind,@PathVariable String id,@RequestBody ReferenceChange input,HttpServletRequest request,HttpServletResponse response){service.reference(AdminAccess.proof(request,response),kind,id,input);return Map.of("saved",true);}
    @GetMapping("/settings") public List<Setting> settings(HttpServletRequest request,HttpServletResponse response){return service.settings(AdminAccess.proof(request,response));}
    @PatchMapping("/settings/{id}") public Map<String,Boolean> setting(@PathVariable String id,@RequestBody SettingChange input,HttpServletRequest request,HttpServletResponse response){service.setting(AdminAccess.proof(request,response),id,input);return Map.of("saved",true);}
}
