package br.com.menufacil.config.tenant;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;

/**
 * Aspect que seta a variável de sessão PostgreSQL app.current_tenant_id
 * antes de cada transação. Isso ativa o Row-Level Security (RLS).
 *
 * Funciona em conjunto com a policy SQL:
 * USING (tenant_id::text = current_setting('app.current_tenant_id', true))
 */
@Slf4j
@Aspect
@Component
@Order(Ordered.LOWEST_PRECEDENCE - 20) // Antes do HibernateTenantFilterAspect
public class TenantConnectionInterceptor {

    private final DataSource dataSource;

    public TenantConnectionInterceptor(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Around("@annotation(org.springframework.transaction.annotation.Transactional) || " +
            "@within(org.springframework.transaction.annotation.Transactional)")
    public Object setTenantOnConnection(ProceedingJoinPoint pjp) throws Throwable {
        String tenantId = TenantContext.getCurrentId();

        if (tenantId != null) {
            try (Connection conn = dataSource.getConnection();
                 PreparedStatement ps = conn.prepareStatement("SET LOCAL app.current_tenant_id = ?")) {
                ps.setString(1, tenantId);
                ps.execute();
                log.trace("RLS tenant setado: {}", tenantId);
            } catch (Exception e) {
                log.trace("Não foi possível setar RLS tenant: {}", e.getMessage());
            }
        }

        return pjp.proceed();
    }
}
