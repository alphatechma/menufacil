package br.com.menufacil.config.tenant;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

@Slf4j
@Component
@RequiredArgsConstructor
public class TenantFilter implements Filter {

    private final DataSource dataSource;

    private static final String HEADER_TENANT_SLUG = "X-Tenant-Slug";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String slug = httpRequest.getHeader(HEADER_TENANT_SLUG);

        if (slug != null && !slug.isBlank()) {
            String tenantId = resolveTenantId(slug.trim());
            if (tenantId != null) {
                TenantContext.setCurrentTenant(slug.trim(), tenantId);
            }
        }

        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private String resolveTenantId(String slug) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT id FROM tenants WHERE slug = ? AND is_active = true")) {
            ps.setString(1, slug);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("id");
                }
            }
        } catch (Exception e) {
            log.warn("Erro ao resolver tenant slug '{}': {}", slug, e.getMessage());
        }
        return null;
    }

    @Configuration
    static class TenantFilterConfig {
        @Bean
        public FilterRegistrationBean<TenantFilter> tenantFilterRegistration(TenantFilter filter) {
            FilterRegistrationBean<TenantFilter> registration = new FilterRegistrationBean<>();
            registration.setFilter(filter);
            registration.addUrlPatterns("/*");
            registration.setOrder(1);
            return registration;
        }
    }
}
