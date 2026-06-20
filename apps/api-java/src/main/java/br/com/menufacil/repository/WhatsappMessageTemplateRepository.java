package br.com.menufacil.repository;

import br.com.menufacil.domain.models.WhatsappMessageTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhatsappMessageTemplateRepository extends JpaRepository<WhatsappMessageTemplate, UUID> {

    List<WhatsappMessageTemplate> findByTenantId(UUID tenantId);

    Optional<WhatsappMessageTemplate> findByTenantIdAndName(UUID tenantId, String name);

    List<WhatsappMessageTemplate> findByTenantIdOrderByNameAsc(UUID tenantId);
}
