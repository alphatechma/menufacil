package br.com.menufacil.repository;

import br.com.menufacil.domain.models.DeliveryPerson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeliveryPersonRepository extends JpaRepository<DeliveryPerson, UUID> {
    List<DeliveryPerson> findByTenantId(UUID tenantId);
    List<DeliveryPerson> findByTenantIdAndIsActiveTrue(UUID tenantId);
}
