package eduupm.hsaas.registrationentry;

import java.io.IOException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.SessionRepositoryFilter;
import org.springframework.web.filter.OncePerRequestFilter;
import eduupm.hsaas.common.ApiErrors;
import eduupm.hsaas.common.ApiFailure;

/** Disabled entry APIs report capability status before any QR operation; enabled APIs retain all Security checks. */
@Configuration
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
@EnableConfigurationProperties(QrProperties.class)
public class QrAvailabilityConfiguration {
    /** Runs after Session wrapping and before Security; it cannot authorize a request when enabled. */
    @Bean public FilterRegistrationBean<OncePerRequestFilter> qrAvailability(QrProperties properties,ApiErrors errors) {
        var filter=new OncePerRequestFilter() {
            @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
                String path=request.getServletPath();
                boolean stateful=path.equals("/api/public/registration-entry") || path.equals("/api/public/registration-entry/exchange")
                        || path.equals("/api/staff/registration-qr-sessions") || path.startsWith("/api/staff/registration-qr-sessions/");
                if(!properties.enabled() && stateful) { errors.write(request,response,new ApiFailure(409,"INTEGRATION_DISABLED","Registration entry is not enabled."));return; }
                chain.doFilter(request,response);
            }
        };
        var bean=new FilterRegistrationBean<OncePerRequestFilter>(filter);bean.setOrder(SessionRepositoryFilter.DEFAULT_ORDER+20);bean.addUrlPatterns("/*");return bean;
    }
}
