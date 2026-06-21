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
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("name", reward.getName());
            details.put("pointsRequired", reward.getPointsRequired());
            details.put("isActive", reward.isActive());
            auditLogService.log(
                    reward.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "loyalty_reward",
                    reward.getId(),
                    reward.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de criação de recompensa: {}", e.getMessage());
        }

        return loyaltyConverter.toRewardResponse(reward);
    }

    @Transactional
    public LoyaltyRewardResponse updateReward(UUID id, UUID tenantId, CreateLoyaltyRewardRequest request) {
        LoyaltyReward reward = rewardRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Recompensa não encontrada"));
        validateRewardTenant(reward, tenantId);

        String oldName = reward.getName();
        int oldPoints = reward.getPointsRequired();
        boolean oldActive = reward.isActive();

        loyaltyConverter.updateRewardFromRequest(request, reward);
        reward = rewardRepository.save(reward);
        log.info("Recompensa atualizada: {} no tenant {}", reward.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldName", oldName);
            details.put("newName", reward.getName());
            details.put("oldPointsRequired", oldPoints);
            details.put("newPointsRequired", reward.getPointsRequired());
            details.put("oldIsActive", oldActive);
            details.put("newIsActive", reward.isActive());
            auditLogService.log(
                    reward.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "loyalty_reward",
                    reward.getId(),
                    reward.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de atualização de recompensa: {}", e.getMessage());
        }

        return loyaltyConverter.toRewardResponse(reward);
    }

    @Transactional
    public void deleteReward(UUID id, UUID tenantId) {
        LoyaltyReward reward = rewardRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Recompensa não encontrada"));
        validateRewardTenant(reward, tenantId);

        UUID rewardId = reward.getId();
        UUID rewardTenantId = reward.getTenantId();
        String rewardName = reward.getName();

        rewardRepository.delete(reward);
        log.info("Recompensa removida: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    rewardTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "loyalty_reward",
                    rewardId,
                    rewardName,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de remoção de recompensa: {}", e.getMessage());
        }
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

        int pointsBefore = customer.getLoyaltyPoints();
        customer.setLoyaltyPoints(pointsBefore + points);
        customerRepository.save(customer);
        log.info("Pontos adicionados: {} pontos para cliente {} no tenant {}", points, customerId, tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("customerId", customerId.toString());
            details.put("pointsAdded", points);
            details.put("pointsBefore", pointsBefore);
            details.put("pointsAfter", customer.getLoyaltyPoints());
            auditLogService.log(
                    customer.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "add_points",
                    "loyalty_redemption",
                    customerId,
                    customer.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de adição de pontos: {}", e.getMessage());
        }
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

        int pointsBefore = customer.getLoyaltyPoints();
        // Deduzir pontos
        customer.setLoyaltyPoints(pointsBefore - reward.getPointsRequired());
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

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("customerId", customerId.toString());
            details.put("rewardId", rewardId.toString());
            details.put("rewardName", reward.getName());
            details.put("pointsSpent", redemption.getPointsSpent());
            details.put("pointsBefore", pointsBefore);
            details.put("pointsAfter", customer.getLoyaltyPoints());
            details.put("status", redemption.getStatus());
            auditLogService.log(
                    redemption.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "redeem",
                    "loyalty_redemption",
                    redemption.getId(),
                    reward.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de resgate de recompensa: {}", e.getMessage());
        }

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

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        Object details = auth.getDetails();
        if (details instanceof Claims claims) {
            String userId = claims.get("userId", String.class);
            if (userId != null && !userId.isBlank()) {
                try { return UUID.fromString(userId); } catch (IllegalArgumentException ignored) {}
            }
        }
        return null;
    }

    private String getCurrentIpAddress() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes)
                    RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                String forwarded = req.getHeader("X-Forwarded-For");
                if (forwarded != null && !forwarded.isBlank()) {
                    return forwarded.split(",")[0].trim();
                }
                return req.getRemoteAddr();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String serializeDetails(Map<String, Object> details) {
        if (details == null || details.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(details);
        } catch (Exception e) {
            return details.toString();
        }
    }
}
