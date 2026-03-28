package br.com.menufacil.repository;

import br.com.menufacil.domain.enums.OrderStatus;
import br.com.menufacil.domain.models.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    List<Order> findByTenantIdAndStatus(UUID tenantId, OrderStatus status);
    long countByTenantIdAndStatus(UUID tenantId, OrderStatus status);
}
