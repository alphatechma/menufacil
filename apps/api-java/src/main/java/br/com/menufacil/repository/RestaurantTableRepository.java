package br.com.menufacil.repository;

import br.com.menufacil.domain.models.RestaurantTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RestaurantTableRepository extends JpaRepository<RestaurantTable, UUID> {
    List<RestaurantTable> findByTenantIdOrderBySortOrderAsc(UUID tenantId);
    Optional<RestaurantTable> findByNumberAndTenantId(int number, UUID tenantId);
}
