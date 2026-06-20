package br.com.menufacil.repository;

import br.com.menufacil.domain.models.WhatsappFlowExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhatsappFlowExecutionRepository extends JpaRepository<WhatsappFlowExecution, UUID> {

    List<WhatsappFlowExecution> findByTenantIdAndPhoneAndActiveTrue(UUID tenantId, String phone);

    List<WhatsappFlowExecution> findByFlowIdAndActiveTrue(UUID flowId);

    Optional<WhatsappFlowExecution> findFirstByTenantIdAndPhoneAndActiveTrueOrderByStartedAtDesc(
            UUID tenantId, String phone);

    List<WhatsappFlowExecution> findByTenantIdAndActiveTrue(UUID tenantId);
}
