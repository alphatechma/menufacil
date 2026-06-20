package br.com.menufacil.repository;

import br.com.menufacil.domain.models.FloorPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FloorPlanRepository extends JpaRepository<FloorPlan, UUID> {
    List<FloorPlan> findByTenantIdOrderByCreatedAtAsc(UUID tenantId);
    List<FloorPlan> findByTenantIdAndUnitIdOrderByCreatedAtAsc(UUID tenantId, UUID unitId);
}
