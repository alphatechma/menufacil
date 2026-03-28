package br.com.menufacil.repository;

import br.com.menufacil.domain.models.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {
    List<Review> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    Optional<Review> findByOrderIdAndTenantId(UUID orderId, UUID tenantId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.tenantId = :tenantId")
    Double findAverageRatingByTenantId(@Param("tenantId") UUID tenantId);

    @Query("SELECT r.rating, COUNT(r) FROM Review r WHERE r.tenantId = :tenantId GROUP BY r.rating ORDER BY r.rating")
    List<Object[]> countByRatingAndTenantId(@Param("tenantId") UUID tenantId);

    long countByTenantId(UUID tenantId);
}
