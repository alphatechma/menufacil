package br.com.menufacil.repository;

import br.com.menufacil.domain.models.WhatsappInstance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhatsappInstanceRepository extends JpaRepository<WhatsappInstance, UUID> {

    List<WhatsappInstance> findByTenantId(UUID tenantId);

    Optional<WhatsappInstance> findByInstanceName(String instanceName);

    Optional<WhatsappInstance> findByInstanceNameAndTenantId(String instanceName, UUID tenantId);

    Optional<WhatsappInstance> findFirstByTenantIdOrderByCreatedAtAsc(UUID tenantId);

    List<WhatsappInstance> findByTenantIdAndUnitId(UUID tenantId, UUID unitId);
}
