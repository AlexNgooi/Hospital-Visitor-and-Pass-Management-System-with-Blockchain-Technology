package eduupm.hsaas.config;

import java.io.IOException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.session.web.http.SessionRepositoryFilter;
import org.springframework.web.filter.OncePerRequestFilter;
import eduupm.hsaas.auth.*;
import eduupm.hsaas.common.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;

/** Defines browser session security, separate roles, and closed machine integration surfaces. */
@Configuration
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
public class SecurityConfig {
    /** The database service suppresses Boot's generated-password user. */
    @Bean public AuthenticationManager authenticationManager(Accounts accounts,PasswordEncoder encoder) {
        var provider=new DaoAuthenticationProvider(accounts); provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }
    /** JSON login explicitly saves the SecurityContext before capability activation. */
    @Bean public SecurityContextRepository securityContextRepository() { return new HttpSessionSecurityContextRepository(); }
    /** CSRF uses the framework token generator and the C01 header. */
    @Bean public HttpSessionCsrfTokenRepository csrfRepository() {
        var csrf=new HttpSessionCsrfTokenRepository(); csrf.setHeaderName("X-CSRF-TOKEN"); return csrf;
    }
    /** Sits outside SessionRepositoryFilter so automatic persistence happens before releasing JSON. */
    @Bean public FilterRegistrationBean<SessionResponseFilter> responsePersistence(GuardedSessionRepository sessions,ApiErrors errors) {
        var filter=new FilterRegistrationBean<>(new SessionResponseFilter(sessions,errors));
        // Clear request-local tracking on every backend path, even when a denied non-API request loads a Session.
        filter.setOrder(SessionRepositoryFilter.DEFAULT_ORDER-10); filter.addUrlPatterns("/*"); return filter;
    }

    /** Role checks never grant ADMIN the counter role; all browser writes keep CSRF enabled. */
    @Bean public SecurityFilterChain browserSecurity(HttpSecurity http,ApiErrors errors,SessionCapabilities capabilities,
            SecurityContextRepository contexts,HttpSessionCsrfTokenRepository csrf) throws Exception {
        http.securityContext(context->context.securityContextRepository(contexts).requireExplicitSave(true))
            .csrf(config->config.csrfTokenRepository(csrf))
            .requestCache(cache->cache.disable()).formLogin(form->form.disable()).httpBasic(basic->basic.disable())
            .logout(logout->logout.disable())
            .authorizeHttpRequests(auth->auth.requestMatchers("/api/public/**","/api/auth/login","/api/auth/logout","/api/health").permitAll()
                    .requestMatchers("/api/staff/**").hasRole("COUNTER_STAFF").requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .requestMatchers("/api/auth/me").authenticated().anyRequest().denyAll())
            .exceptionHandling(handler->handler.authenticationEntryPoint((request,response,failure)->errors.write(request,response,ApiFailure.unauthenticated()))
                    .accessDeniedHandler((request,response,failure)->errors.write(request,response,new ApiFailure(403,
                            failure instanceof CsrfException?"CSRF_INVALID":"ACCESS_DENIED","Request is not permitted."))));
        // Disabled machine requests cannot reach authentication, CSRF mutation, or an external adapter.
        http.addFilterBefore(new OncePerRequestFilter() {
            @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
                // Servlet path is decoded and excludes contextPath, matching the endpoint's routing coordinates.
                String path=request.getServletPath();
                if(path.startsWith("/api/device/") || path.startsWith("/api/integrations/")) {
                    errors.write(request,response,new ApiFailure(409,"INTEGRATION_DISABLED","Integration is not enabled.")); return;
                }
                chain.doFilter(request,response);
            }
        },CsrfFilter.class);
        // A cached principal cannot survive account, permission, logout, or owner deadline revocation.
        http.addFilterAfter(new OncePerRequestFilter() {
            @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
                var auth=SecurityContextHolder.getContext().getAuthentication();
                String path=request.getServletPath();
                boolean protectedPath=path.equals("/api/auth/me") || path.startsWith("/api/staff/") || path.startsWith("/api/admin/");
                if(protectedPath && auth!=null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
                    var session=request.getSession(false);
                    try {
                        if(session==null) { throw ApiFailure.unauthenticated(); }
                        capabilities.requireHuman((String)session.getAttribute(SessionCapabilities.BINDING),
                                (String)session.getAttribute(SessionCapabilities.CONTEXT),(Long)session.getAttribute(SessionCapabilities.GENERATION),auth.getName());
                    } catch(ApiFailure failure) { errors.write(request,response,failure); return; }
                }
                chain.doFilter(request,response);
            }
        },AnonymousAuthenticationFilter.class);
        return http.build();
    }
}
