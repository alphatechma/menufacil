package br.com.menufacil.repository;

import br.com.menufacil.domain.models.LoyaltyReward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LoyaltyRewardRepository extends JpaRepository<LoyaltyReward, UUID> {
    List<LoyaltyReward> findByTenantId(UUID tenantId);
    List<LoyaltyReward> findByTenantIdAndIsActiveTrue(UUID tenantId);
}
