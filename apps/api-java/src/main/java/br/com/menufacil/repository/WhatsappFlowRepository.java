package br.com.menufacil.repository;

import br.com.menufacil.domain.enums.WhatsappFlowTriggerType;
import br.com.menufacil.domain.models.WhatsappFlow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WhatsappFlowRepository extends JpaRepository<WhatsappFlow, UUID> {

    List<WhatsappFlow> findByTenantId(UUID tenantId);

    List<WhatsappFlow> findByTenantIdAndActiveTrue(UUID tenantId);

    List<WhatsappFlow> findByTenantIdAndTriggerType(UUID tenantId, WhatsappFlowTriggerType triggerType);

    List<WhatsappFlow> findByTenantIdOrderByPriorityDescCreatedAtDesc(UUID tenantId);

    List<WhatsappFlow> findByTenantIdAndTriggerTypeAndActiveTrueOrderByPriorityDesc(
            UUID tenantId, WhatsappFlowTriggerType triggerType);
}
