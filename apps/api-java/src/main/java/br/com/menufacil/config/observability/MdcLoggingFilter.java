package br.com.menufacil.config.observability;

import br.com.menufacil.config.tenant.TenantContext;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.MDC;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.util.UUID;

/**
 * Popula o MDC com identificadores de correlação para que apareçam em
 * todos os logs JSON estruturados (Loki/Elastic) e nos breadcrumbs do Sentry.
 *
 * <p>Chaves adicionadas:</p>
 * <ul>
 *   <li>{@code request_id} — UUID gerado por request (ou X-Request-Id se vier)</li>
 *   <li>{@code tenant_id}, {@code tenant_slug} — do TenantContext (ja populado pelo TenantFilter)</li>
 * </ul>
 *
 * <p>Trace/span IDs do OpenTelemetry sao automaticos via
 * {@code logback-spring.xml} + {@code MDCTraceProvider} do OTel SDK
 * (chaves {@code trace_id} e {@code span_id}).</p>
 *
 * <p>Roda DEPOIS do TenantFilter (que registra ordem 1 no
 * {@code TenantFilterConfig}). Por isso usamos {@code HIGHEST_PRECEDENCE + 10}.</p>
 */
@Configuration
public class MdcLoggingFilter {

    public static final String MDC_REQUEST_ID = "request_id";
    public static final String MDC_TENANT_ID = "tenant_id";
    public static final String MDC_TENANT_SLUG = "tenant_slug";

    private static final String HEADER_REQUEST_ID = "X-Request-Id";

    @Bean
    public FilterRegistrationBean<Filter> mdcLoggingFilterRegistration() {
        FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new MdcFilter());
        registration.addUrlPatterns("/*");
        // Roda depois do TenantFilter (registrado em TenantFilterConfig com order=1)
        registration.setOrder(2);
        registration.setName("mdcLoggingFilter");
        return registration;
    }

    private static class MdcFilter implements Filter {
        @Override
        public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
                throws IOException, ServletException {
            HttpServletRequest http = (HttpServletRequest) request;
            String requestId = http.getHeader(HEADER_REQUEST_ID);
            if (requestId == null || requestId.isBlank()) {
                requestId = UUID.randomUUID().toString();
            }

            try {
                MDC.put(MDC_REQUEST_ID, requestId);
                String tenantId = TenantContext.getCurrentId();
                String tenantSlug = TenantContext.getCurrentSlug();
                if (tenantId != null) {
                    MDC.put(MDC_TENANT_ID, tenantId);
                }
                if (tenantSlug != null) {
                    MDC.put(MDC_TENANT_SLUG, tenantSlug);
                }
                chain.doFilter(request, response);
            } finally {
                MDC.remove(MDC_REQUEST_ID);
                MDC.remove(MDC_TENANT_ID);
                MDC.remove(MDC_TENANT_SLUG);
            }
        }
    }
}
