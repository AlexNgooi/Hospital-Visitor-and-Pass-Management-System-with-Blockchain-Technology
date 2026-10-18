package eduupm.hsaas.assignment;

import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.ApiFailure;
import eduupm.hsaas.common.IdempotencyPort.SafeResult;
import eduupm.hsaas.reader.ReaderPort;
import static eduupm.hsaas.assignment.LifecycleStore.*;

/** Separate existing staff/admin security chains retain CSRF; device machine endpoints remain disabled. */
@RestController
@ConditionalOnProperty(name="hsaas.lifecycle.enabled",havingValue="true")
public class LifecycleController {
    private final LifecycleService service;
    public LifecycleController(LifecycleService service) { this.service=service; }
    @GetMapping({"/api/staff/lifecycle/samples","/api/admin/lifecycle/samples"})
    public List<ReaderPort.Sample> samples(HttpServletRequest request,HttpServletResponse response) {
        noStore(response); return service.samples(context(request),admin(request));
    }
    @GetMapping("/api/admin/lifecycle/counters")
    public List<LifecycleService.CounterView> counters(HttpServletRequest request,HttpServletResponse response) {
        noStore(response); return service.counters(context(request));
    }
    @PostMapping(value={"/api/staff/scan-jobs","/api/admin/scan-jobs"},consumes="application/json")
    public SafeResult start(@RequestBody String body,@RequestHeader(name="Idempotency-Key",required=false) String key,HttpServletRequest request,HttpServletResponse response) {
        return write(request,response,"SCAN_START","REGISTER",key,body);
    }
    @GetMapping({"/api/staff/scan-jobs/{id}","/api/admin/scan-jobs/{id}"})
    public JobView job(@PathVariable String id,HttpServletRequest request,HttpServletResponse response) {
        noStore(response); return service.job(context(request),admin(request),id);
    }
    @PostMapping(value={"/api/staff/scan-jobs/{id}/simulate","/api/admin/scan-jobs/{id}/simulate"},consumes="application/json")
    public SafeResult simulate(@PathVariable String id,@RequestBody String body,@RequestHeader(name="Idempotency-Key",required=false) String key,HttpServletRequest request,HttpServletResponse response) {
        return write(request,response,"SCAN_SIMULATE",id,key,body);
    }
    @PostMapping(value={"/api/staff/scan-jobs/{id}/cancel","/api/admin/scan-jobs/{id}/cancel"},consumes="application/json")
    public SafeResult cancel(@PathVariable String id,@RequestBody String body,@RequestHeader(name="Idempotency-Key",required=false) String key,HttpServletRequest request,HttpServletResponse response) {
        return write(request,response,"SCAN_CANCEL",id,key,body);
    }
    @GetMapping("/api/admin/cards")
    public Page<CardView> cards(@RequestParam(defaultValue="0") String page,HttpServletRequest request,HttpServletResponse response) {
        noStore(response); return service.cards(context(request),page(page));
    }
    @PostMapping(value="/api/admin/cards",consumes="application/json")
    public SafeResult enroll(@RequestBody String body,@RequestHeader(name="Idempotency-Key",required=false) String key,HttpServletRequest request,HttpServletResponse response) {
        return write(request,response,"CARD_ENROLL","REGISTER",key,body);
    }
    @PostMapping(value="/api/admin/cards/{id}/mark-lost",consumes="application/json")
    public SafeResult lost(@PathVariable String id,@RequestBody String body,@RequestHeader(name="Idempotency-Key",required=false) String key,HttpServletRequest request,HttpServletResponse response) {
        return write(request,response,"MARK_LOST",id,key,body);
    }
    @PostMapping(value="/api/admin/cards/{id}/disable",consumes="application/json")
    public SafeResult disable(@PathVariable String id,@RequestBody String body,@RequestHeader(name="Idempotency-Key",required=false) String key,HttpServletRequest request,HttpServletResponse response) {
        return write(request,response,"DISABLE",id,key,body);
    }
    @PostMapping(value="/api/admin/cards/{id}/restore",consumes="application/json")
    public SafeResult restore(@PathVariable String id,@RequestBody String body,@RequestHeader(name="Idempotency-Key",required=false) String key,HttpServletRequest request,HttpServletResponse response) {
        return write(request,response,"RESTORE",id,key,body);
    }
    @GetMapping({"/api/staff/card-assignments","/api/staff/overdue"})
    public Page<AssignmentView> assignments(@RequestParam String counterId,@RequestParam(defaultValue="0") String page,HttpServletRequest request,HttpServletResponse response) {
        noStore(response); return service.assignments(context(request),LifecycleInput.decimal(counterId),page(page),request.getServletPath().equals("/api/staff/overdue"));
    }
    @GetMapping("/api/staff/card-assignments/{id}")
    public AssignmentView assignment(@PathVariable String id,HttpServletRequest request,HttpServletResponse response) {
        noStore(response); return service.assignment(context(request),id);
    }
    @PostMapping(value="/api/staff/card-assignments",consumes="application/json")
    public SafeResult issue(@RequestBody String body,@RequestHeader(name="Idempotency-Key",required=false) String key,HttpServletRequest request,HttpServletResponse response) {
        return write(request,response,"ISSUE","REGISTER",key,body);
    }
    @PostMapping(value="/api/staff/card-assignments/{id}/return",consumes="application/json")
    public SafeResult returned(@PathVariable String id,@RequestBody String body,@RequestHeader(name="Idempotency-Key",required=false) String key,HttpServletRequest request,HttpServletResponse response) {
        return write(request,response,"RETURN",id,key,body);
    }
    @PostMapping(value="/api/staff/assignments/{id}/followups",consumes="application/json")
    public SafeResult followup(@PathVariable String id,@RequestBody String body,@RequestHeader(name="Idempotency-Key",required=false) String key,HttpServletRequest request,HttpServletResponse response) {
        return write(request,response,"FOLLOWUP",id,key,body);
    }
    @PostMapping(value="/api/staff/assignments/{id}/contact-reveal",consumes="application/json")
    public LifecycleService.Reveal contact(@PathVariable String id,@RequestBody String body,@RequestHeader(name="Idempotency-Key",required=false) String key,HttpServletRequest request,HttpServletResponse response) {
        noStore(response); return service.reveal(context(request),id,key,body);
    }
    @GetMapping({"/api/admin/cards/{id}/history","/api/staff/card-assignments/{id}/history"})
    public List<EventView> history(@PathVariable String id,HttpServletRequest request,HttpServletResponse response) {
        noStore(response); return service.history(context(request),admin(request),id);
    }
    /** JSON commands never accept actor, session, source, UID or an arbitrary status patch. */
    private SafeResult write(HttpServletRequest request,HttpServletResponse response,String operation,String target,String key,String body) {
        noStore(response); return service.command(context(request),admin(request),operation,target,key,body);
    }
    private static boolean admin(HttpServletRequest request) { return request.getServletPath().startsWith("/api/admin/"); }
    private static int page(String page) {
        if(!page.matches("0|[1-9][0-9]{0,5}")) throw LifecycleInput.invalid(); return Integer.parseInt(page);
    }
    private static void noStore(HttpServletResponse response) {
        response.setHeader("Cache-Control","no-store"); response.setHeader("Referrer-Policy","no-referrer");
    }
    /** Framework authentication is only a coordinate source; service revalidates real persisted session/epoch/counter. */
    private static LifecycleSecurity.Context context(HttpServletRequest request) {
        var session=request.getSession(false); var auth=SecurityContextHolder.getContext().getAuthentication();
        if(session==null || auth==null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken
                || !(session.getAttribute(SessionCapabilities.BINDING) instanceof String binding)
                || !(session.getAttribute(SessionCapabilities.CONTEXT) instanceof String owner)
                || !(session.getAttribute(SessionCapabilities.GENERATION) instanceof Long generation)) throw ApiFailure.unauthenticated();
        return new LifecycleSecurity.Context(binding,owner,generation,auth.getName());
    }
}
