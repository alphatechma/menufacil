package br.com.menufacil.config.tenant;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import javax.sql.DataSource;
import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

/**
 * Servlet Filter que extrai o tenant do header X-Tenant-Slug,
 * resolve o UUID no banco e armazena no TenantContext.
 */
@Slf4j
@RequiredArgsConstructor
public class TenantFilter implements Filter {

    private final DataSource dataSource;
    private static final String HEADER_TENANT_SLUG = "X-Tenant-Slug";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String slug = normalize(httpRequest.getHeader(HEADER_TENANT_SLUG));

        if (slug != null) {
            String tenantId = resolveTenantId(slug);
            if (tenantId != null) {
                TenantContext.setCurrentTenant(slug, tenantId);
            } else if (log.isDebugEnabled()) {
                log.debug("Tenant não encontrado para slug: {}", slug);
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
             PreparedStatement ps = conn.prepareStatement(
                     "SELECT id::text FROM tenants WHERE slug = ? AND is_active = true AND deleted_at IS NULL")) {
            ps.setString(1, slug);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getString(1);
                }
            }
        } catch (Exception e) {
            log.warn("Erro ao resolver tenant '{}': {}", slug, e.getMessage());
        }
        return null;
    }

    private static String normalize(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
