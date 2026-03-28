package br.com.menufacil.service;

import br.com.menufacil.converter.LoyaltyConverter;
import br.com.menufacil.domain.models.Customer;
import br.com.menufacil.domain.models.LoyaltyRedemption;
import br.com.menufacil.domain.models.LoyaltyReward;
import br.com.menufacil.dto.CreateLoyaltyRewardRequest;
import br.com.menufacil.dto.LoyaltyRedemptionResponse;
import br.com.menufacil.dto.LoyaltyRewardResponse;
import br.com.menufacil.repository.CustomerRepository;
import br.com.menufacil.repository.LoyaltyRedemptionRepository;
import br.com.menufacil.repository.LoyaltyRewardRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LoyaltyService {

    private final LoyaltyRewardRepository rewardRepository;
    private final LoyaltyRedemptionRepository redemptionRepository;
    private final CustomerRepository customerRepository;
    private final LoyaltyConverter loyaltyConverter;

    // ---- Rewards CRUD ----

    public List<LoyaltyRewardResponse> findAllRewardsByTenant(UUID tenantId) {
        return rewardRepository.findByTenantId(tenantId).stream()
                .map(loyaltyConverter::toRewardResponse)
                .toList();
    }

    public List<LoyaltyRewardResponse> findActiveRewardsByTenant(UUID tenantId) {
        return rewardRepository.findByTenantIdAndIsActiveTrue(tenantId).stream()
                .map(loyaltyConverter::toRewardResponse)
                .toList();
    }

    public LoyaltyRewardResponse findRewardById(UUID id, UUID tenantId) {
        LoyaltyReward reward = rewardRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Recompensa não encontrada"));
        validateRewardTenant(reward, tenantId);
        return loyaltyConverter.toRewardResponse(reward);
    }

    @Transactional
    public LoyaltyRewardResponse createReward(UUID tenantId, CreateLoyaltyRewardRequest request) {
        LoyaltyReward reward = loyaltyConverter.toRewardEntity(request);
        reward.setTenantId(tenantId);
        reward = rewardRepository.save(reward);
        log.info("Recompensa criada: {} no tenant {}", reward.getName(), tenantId);
        return loyaltyConverter.toRewardResponse(reward);
    }

    @Transactional
    public LoyaltyRewardResponse updateReward(UUID id, UUID tenantId, CreateLoyaltyRewardRequest request) {
        LoyaltyReward reward = rewardRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Recompensa não encontrada"));
        validateRewardTenant(reward, tenantId);
        loyaltyConverter.updateRewardFromRequest(request, reward);
        reward = rewardRepository.save(reward);
        log.info("Recompensa atualizada: {} no tenant {}", reward.getName(), tenantId);
        return loyaltyConverter.toRewardResponse(reward);
    }

    @Transactional
    public void deleteReward(UUID id, UUID tenantId) {
        LoyaltyReward reward = rewardRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Recompensa não encontrada"));
        validateRewardTenant(reward, tenantId);
        rewardRepository.delete(reward);
        log.info("Recompensa removida: {} no tenant {}", id, tenantId);
    }

    // ---- Points ----

    @Transactional
    public void addPoints(UUID customerId, int points, UUID tenantId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente não encontrado"));

        if (!customer.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }

        customer.setLoyaltyPoints(customer.getLoyaltyPoints() + points);
        customerRepository.save(customer);
        log.info("Pontos adicionados: {} pontos para cliente {} no tenant {}", points, customerId, tenantId);
    }

    // ---- Redemptions ----

    @Transactional
    public LoyaltyRedemptionResponse redeemReward(UUID customerId, UUID rewardId, UUID tenantId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente não encontrado"));

        if (!customer.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }

        LoyaltyReward reward = rewardRepository.findById(rewardId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Recompensa não encontrada"));

        if (!reward.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }

        if (!reward.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recompensa inativa");
        }

        if (customer.getLoyaltyPoints() < reward.getPointsRequired()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Pontos insuficientes. Necessário: " + reward.getPointsRequired()
                            + ", disponível: " + customer.getLoyaltyPoints());
        }

        // Verificar limite de resgates por cliente
        if (reward.getMaxRedemptionsPerCustomer() > 0) {
            long count = redemptionRepository.countByCustomerIdAndRewardIdAndTenantIdAndStatusNot(
                    customerId, rewardId, tenantId, "expired");
            if (count >= reward.getMaxRedemptionsPerCustomer()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Limite de resgates atingido para esta recompensa");
            }
        }

        // Deduzir pontos
        customer.setLoyaltyPoints(customer.getLoyaltyPoints() - reward.getPointsRequired());
        customerRepository.save(customer);

        // Criar resgate
        LoyaltyRedemption redemption = new LoyaltyRedemption();
        redemption.setTenantId(tenantId);
        redemption.setCustomerId(customerId);
        redemption.setRewardId(rewardId);
        redemption.setPointsSpent(reward.getPointsRequired());
        redemption.setStatus("pending");

        if (reward.getExpirationHours() > 0) {
            redemption.setExpiresAt(LocalDateTime.now().plusHours(reward.getExpirationHours()));
        }

        redemption = redemptionRepository.save(redemption);
        log.info("Resgate realizado: reward={} customer={} tenant={}", rewardId, customerId, tenantId);

        return loyaltyConverter.toRedemptionResponse(redemption);
    }

    public List<LoyaltyRedemptionResponse> findRedemptionsByCustomer(UUID customerId, UUID tenantId) {
        return redemptionRepository.findByCustomerIdAndTenantId(customerId, tenantId).stream()
                .map(loyaltyConverter::toRedemptionResponse)
                .toList();
    }

    private void validateRewardTenant(LoyaltyReward reward, UUID tenantId) {
        if (!reward.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
