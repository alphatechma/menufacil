package br.com.menufacil.repository;

import br.com.menufacil.domain.models.LoyaltyRedemption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LoyaltyRedemptionRepository extends JpaRepository<LoyaltyRedemption, UUID> {
    List<LoyaltyRedemption> findByCustomerIdAndTenantId(UUID customerId, UUID tenantId);
    List<LoyaltyRedemption> findByCustomerIdAndRewardIdAndTenantId(UUID customerId, UUID rewardId, UUID tenantId);
    long countByCustomerIdAndRewardIdAndTenantIdAndStatusNot(UUID customerId, UUID rewardId, UUID tenantId, String status);
}
