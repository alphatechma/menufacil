package br.com.menufacil.service;

import br.com.menufacil.converter.PromotionConverter;
import br.com.menufacil.domain.models.Promotion;
import br.com.menufacil.dto.*;
import br.com.menufacil.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PromotionService {

    private final PromotionRepository promotionRepository;
    private final PromotionConverter promotionConverter;

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
        return promotionConverter.toResponse(entity);
    }

    @Transactional
    public PromotionResponse update(UUID id, UUID tenantId, CreatePromotionRequest request) {
        Promotion entity = promotionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Promoção não encontrada"));
        validateTenant(entity, tenantId);
        promotionConverter.updateFromRequest(request, entity);
        entity = promotionRepository.save(entity);
        log.info("Promoção atualizada: {} no tenant {}", entity.getName(), tenantId);
        return promotionConverter.toResponse(entity);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Promotion entity = promotionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Promoção não encontrada"));
        validateTenant(entity, tenantId);
        promotionRepository.delete(entity);
        log.info("Promoção removida: {} no tenant {}", id, tenantId);
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
}
