package eduupm.hsaas.registrationentry;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.web.bind.annotation.*;
import eduupm.hsaas.auth.SessionCapabilities;
import eduupm.hsaas.common.ApiFailure;

/** HTTP adapters never accept actor/session/grant identity from JSON; Spring Security owns role and CSRF checks. */
@RestController
@ConditionalOnProperty(name="hsaas.qr.enabled",havingValue="true")
public class QrController {
    private final QrEntryService entries;
    private final EntryLimiter limiter;
    public QrController(QrEntryService entries,EntryLimiter limiter) { this.entries=entries;this.limiter=limiter; }
    /** A display is created only through the authenticated session's internal owner coordinates. */
    @PostMapping("/api/staff/registration-qr-sessions")
    public QrEntryService.Created create(@RequestBody QrEntryService.CreateRequest input,HttpServletRequest request,HttpServletResponse response) {
        noStore(response);response.setStatus(201);return entries.create(attribute(request,SessionCapabilities.CONTEXT),attribute(request,SessionCapabilities.BINDING),input);
    }
    /** Returns a signed server challenge; response headers forbid browser/proxy retention. */
    @GetMapping("/api/staff/registration-qr-sessions/{id}/current")
    public QrEntryService.Current current(@PathVariable String id,HttpServletRequest request,HttpServletResponse response) {
        noStore(response);return entries.current(attribute(request,SessionCapabilities.CONTEXT),id);
    }
    /** Explicit revoke is independent of browser unload and cannot be undone by refreshing a page. */
    @PostMapping("/api/staff/registration-qr-sessions/{id}/revoke")
    public void revoke(@PathVariable String id,HttpServletRequest request,HttpServletResponse response) {
        noStore(response);entries.revoke(attribute(request,SessionCapabilities.CONTEXT),id);response.setStatus(204);
    }
    /** Shared challenges mint independent browser-bound forms; the first visitor never exhausts the QR. */
    @PostMapping("/api/public/registration-entry/exchange")
    public QrEntryService.Entry exchange(@RequestBody QrEntryService.ExchangeRequest input,HttpServletRequest request,HttpServletResponse response) {
        noStore(response);String binding=attribute(request,SessionCapabilities.BINDING);
        limiter.check(binding,request.getRemoteAddr());return entries.exchange(binding,input);
    }
    /** Recovery exposes only context/scope/expiry, never a visitor's previously entered personal information. */
    @GetMapping("/api/public/registration-entry")
    public QrEntryService.Entry entry(HttpServletRequest request,HttpServletResponse response) {
        noStore(response);return entries.entry(attribute(request,SessionCapabilities.BINDING));
    }
    private String attribute(HttpServletRequest request,String name) {
        var session=request.getSession(false);String value=session==null?null:(String)session.getAttribute(name);
        if(value==null) { throw new ApiFailure(403,"REGISTRATION_ENTRY_REQUIRED","Bootstrap the session and scan the counter QR."); }return value;
    }
    private void noStore(HttpServletResponse response) { response.setHeader("Cache-Control","no-store");response.setHeader("Referrer-Policy","no-referrer"); }
}
