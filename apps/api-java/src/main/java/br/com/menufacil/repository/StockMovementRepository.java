package br.com.menufacil.repository;

import br.com.menufacil.domain.models.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, UUID> {
    List<StockMovement> findByInventoryItemIdAndTenantId(UUID inventoryItemId, UUID tenantId);
    List<StockMovement> findByTenantId(UUID tenantId);
}
