package br.com.menufacil.domain.models;

import br.com.menufacil.config.tenant.TenantContext;
import jakarta.persistence.PrePersist;

import java.util.UUID;

/**
 * EntityListener que seta automaticamente o tenant_id
 * ao persistir uma nova entidade, usando o TenantContext.
 */
public class BaseEntityListener {

    @PrePersist
    public void prePersist(BaseEntity entity) {
        if (entity.getTenantId() == null) {
            String tenantId = TenantContext.getCurrentId();
            if (tenantId != null) {
                entity.setTenantId(UUID.fromString(tenantId));
            }
        }
    }
}
