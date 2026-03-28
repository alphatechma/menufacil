package br.com.menufacil.repository;

import br.com.menufacil.domain.models.Tenant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    Optional<Tenant> findBySlugAndIsActiveTrue(String slug);
    Optional<Tenant> findBySlug(String slug);

    long countByIsActiveTrue();
    long countByDeletedAtIsNull();
    long countByIsActiveTrueAndDeletedAtIsNull();

    @Query("SELECT t FROM Tenant t WHERE " +
            "(:search IS NULL OR LOWER(t.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(t.slug) LIKE LOWER(CONCAT('%', :search, '%'))) " +
            "AND (:isActive IS NULL OR t.isActive = :isActive) " +
            "AND (:deleted = true OR t.deletedAt IS NULL)")
    Page<Tenant> findWithFilters(
            @Param("search") String search,
            @Param("isActive") Boolean isActive,
            @Param("deleted") boolean deleted,
            Pageable pageable);

    @Query("SELECT t.planId, COUNT(t) FROM Tenant t WHERE t.deletedAt IS NULL GROUP BY t.planId")
    List<Object[]> countByPlanGrouped();
}
