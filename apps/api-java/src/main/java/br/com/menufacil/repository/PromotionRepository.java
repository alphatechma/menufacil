package br.com.menufacil.repository;

import br.com.menufacil.domain.models.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, UUID> {
    List<Promotion> findByTenantId(UUID tenantId);

    @Query("SELECT p FROM Promotion p WHERE p.tenantId = :tenantId AND p.isActive = true " +
            "AND (p.validFrom IS NULL OR p.validFrom <= :now) " +
            "AND (p.validTo IS NULL OR p.validTo >= :now)")
    List<Promotion> findActiveByTenantId(@Param("tenantId") UUID tenantId, @Param("now") LocalDateTime now);
}
