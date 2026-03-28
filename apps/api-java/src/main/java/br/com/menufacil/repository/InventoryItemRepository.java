package br.com.menufacil.repository;

import br.com.menufacil.domain.models.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, UUID> {
    List<InventoryItem> findByTenantId(UUID tenantId);

    @Query("SELECT i FROM InventoryItem i WHERE i.tenantId = :tenantId AND i.minStock IS NOT NULL AND i.quantity <= i.minStock")
    List<InventoryItem> findLowStockByTenantId(@Param("tenantId") UUID tenantId);
}
