package br.com.menufacil.repository;

import br.com.menufacil.domain.models.AbandonedCart;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AbandonedCartRepository extends JpaRepository<AbandonedCart, UUID> {

    Optional<AbandonedCart> findFirstByTenantIdAndCustomerIdAndRecoveredFalseOrderByCreatedAtDesc(
            UUID tenantId, UUID customerId);

    Page<AbandonedCart> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);

    long countByTenantId(UUID tenantId);

    long countByTenantIdAndRecoveredTrue(UUID tenantId);

    List<AbandonedCart> findByTenantIdAndRecoveredFalse(UUID tenantId);
}
