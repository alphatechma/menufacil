package br.com.menufacil.service;

import br.com.menufacil.converter.PromotionConverter;
import br.com.menufacil.domain.models.Promotion;
import br.com.menufacil.dto.*;
import br.com.menufacil.repository.PromotionRepository;
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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final PromotionConverter promotionConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<PromotionResponse> findAllByTenant(UUID tenantId) {
        return promotionRepository.findByTenantId(tenantId).stream()
                .map(promotionConverter::toResponse)
                .toList();
    }

    public PromotionResponse findById(UUID id, UUID tenantId) {
        Promotion entity = promotionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Promoção não encontrada"));
        validateTenant(entity, tenantId);
        return promotionConverter.toResponse(entity);
    }

    @Transactional
    public PromotionResponse create(UUID tenantId, CreatePromotionRequest request) {
        Promotion entity = promotionConverter.toEntity(request);
        entity.setTenantId(tenantId);
        entity = promotionRepository.save(entity);
        log.info("Promoção criada: {} no tenant {}", entity.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("name", entity.getName());
            details.put("discountType", entity.getDiscountType());
            details.put("discountValue", entity.getDiscountValue());
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "promotion",
                    entity.getId(),
                    entity.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de criação de promoção: {}", e.getMessage());
        }

        return promotionConverter.toResponse(entity);
    }

    @Transactional
    public PromotionResponse update(UUID id, UUID tenantId, CreatePromotionRequest request) {
        Promotion entity = promotionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Promoção não encontrada"));
        validateTenant(entity, tenantId);

        String oldName = entity.getName();
        String oldDiscountType = entity.getDiscountType();
        BigDecimal oldDiscountValue = entity.getDiscountValue();

        promotionConverter.updateFromRequest(request, entity);
        entity = promotionRepository.save(entity);
        log.info("Promoção atualizada: {} no tenant {}", entity.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldName", oldName);
            details.put("newName", entity.getName());
            details.put("oldDiscountType", oldDiscountType);
            details.put("newDiscountType", entity.getDiscountType());
            details.put("oldDiscountValue", oldDiscountValue);
            details.put("newDiscountValue", entity.getDiscountValue());
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "promotion",
                    entity.getId(),
                    entity.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de atualização de promoção: {}", e.getMessage());
        }

        return promotionConverter.toResponse(entity);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Promotion entity = promotionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Promoção não encontrada"));
        validateTenant(entity, tenantId);

        UUID promotionId = entity.getId();
        UUID promotionTenantId = entity.getTenantId();
        String promotionName = entity.getName();

        promotionRepository.delete(entity);
        log.info("Promoção removida: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    promotionTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "promotion",
                    promotionId,
                    promotionName,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de remoção de promoção: {}", e.getMessage());
        }
    }

    public List<PromotionResponse> getActivePromotions(UUID tenantId) {
        LocalDateTime now = LocalDateTime.now();
        return promotionRepository.findActiveByTenantId(tenantId, now).stream()
                .map(promotionConverter::toResponse)
                .toList();
    }

    public PromotionEvaluateResponse evaluateCart(UUID tenantId, PromotionEvaluateRequest request) {
        LocalDateTime now = LocalDateTime.now();
        List<Promotion> activePromotions = promotionRepository.findActiveByTenantId(tenantId, now);

        BigDecimal cartTotal = request.getItems().stream()
                .map(item -> item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<PromotionEvaluateResponse.AppliedPromotion> appliedPromotions = new ArrayList<>();
        BigDecimal totalDiscount = BigDecimal.ZERO;

        for (Promotion promo : activePromotions) {
            BigDecimal discountAmount;
            if ("percent".equals(promo.getDiscountType())) {
                discountAmount = cartTotal.multiply(promo.getDiscountValue())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            } else {
                discountAmount = promo.getDiscountValue();
            }

            if (discountAmount.compareTo(BigDecimal.ZERO) > 0) {
                appliedPromotions.add(PromotionEvaluateResponse.AppliedPromotion.builder()
                        .promotionId(promo.getId().toString())
                        .promotionName(promo.getName())
                        .discountType(promo.getDiscountType())
                        .discountValue(promo.getDiscountValue())
                        .discountAmount(discountAmount)
                        .build());
                totalDiscount = totalDiscount.add(discountAmount);
            }
        }

        return PromotionEvaluateResponse.builder()
                .totalDiscount(totalDiscount)
                .appliedPromotions(appliedPromotions)
                .build();
    }

    private void validateTenant(Promotion entity, UUID tenantId) {
        if (!entity.getTenantId().equals(tenantId)) {
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
