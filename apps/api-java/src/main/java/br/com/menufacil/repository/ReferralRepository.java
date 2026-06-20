package br.com.menufacil.repository;

import br.com.menufacil.domain.models.Referral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReferralRepository extends JpaRepository<Referral, UUID> {

    Optional<Referral> findByReferrerIdAndTenantIdAndReferredIdIsNull(UUID referrerId, UUID tenantId);

    Optional<Referral> findByCodeAndTenantId(String code, UUID tenantId);

    boolean existsByCode(String code);

    List<Referral> findByReferrerIdAndTenantIdOrderByCreatedAtDesc(UUID referrerId, UUID tenantId);

    Optional<Referral> findByReferredIdAndTenantId(UUID referredId, UUID tenantId);

    @Query("SELECT new br.com.menufacil.dto.ReferralStatsResponse$TopReferrer(" +
            "CAST(r.referrerId as string), " +
            "COUNT(r), " +
            "COALESCE(SUM(r.pointsAwarded), 0L)) " +
            "FROM Referral r " +
            "WHERE r.tenantId = :tenantId AND r.referredId IS NOT NULL " +
            "GROUP BY r.referrerId " +
            "ORDER BY COUNT(r) DESC")
    List<br.com.menufacil.dto.ReferralStatsResponse.TopReferrer> findTopReferrers(@Param("tenantId") UUID tenantId);

    long countByTenantIdAndReferredIdIsNotNull(UUID tenantId);

    long countByTenantIdAndReferredIdIsNotNullAndRewardGivenTrue(UUID tenantId);

    @Query("SELECT COALESCE(SUM(r.pointsAwarded), 0) FROM Referral r " +
            "WHERE r.tenantId = :tenantId AND r.referredId IS NOT NULL")
    long sumPointsAwardedByTenant(@Param("tenantId") UUID tenantId);
}
