package br.com.menufacil.config.tenant;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.hibernate.Session;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Aspect que ativa automaticamente o Hibernate Filter de tenant
 * em todo método anotado com @Transactional.
 *
 * Garante que queries JPA retornem apenas dados do tenant corrente,
 * sem que o desenvolvedor precise adicionar filtro manualmente.
 *
 * Padrão replicado do projeto Sigma (HibernateEmpresaFilterAspect).
 */
@Slf4j
@Aspect
@Component
@Order(Ordered.LOWEST_PRECEDENCE - 10)
public class HibernateTenantFilterAspect {

    @PersistenceContext
    private EntityManager entityManager;

    @Around("@annotation(org.springframework.transaction.annotation.Transactional) || " +
            "@within(org.springframework.transaction.annotation.Transactional)")
    public Object aroundTransactional(ProceedingJoinPoint pjp) throws Throwable {
        String tenantId = TenantContext.getCurrentId();
        boolean enabled = false;

        if (tenantId != null) {
            try {
                Session session = entityManager.unwrap(Session.class);
                session.enableFilter("tenantFilter").setParameter("tenantId", tenantId);
                enabled = true;
                log.trace("Tenant filter ativado: {}", tenantId);
            } catch (Exception e) {
                log.trace("Não foi possível ativar tenant filter: {}", e.getMessage());
            }
        }

        try {
            return pjp.proceed();
        } finally {
            if (enabled) {
                try {
                    entityManager.unwrap(Session.class).disableFilter("tenantFilter");
                } catch (Exception ignore) {
                    // Ignora se a sessão já foi fechada
                }
            }
        }
    }
}
