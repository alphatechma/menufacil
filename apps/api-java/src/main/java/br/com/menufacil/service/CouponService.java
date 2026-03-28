package br.com.menufacil.service;

import br.com.menufacil.converter.CouponConverter;
import br.com.menufacil.domain.models.Coupon;
import br.com.menufacil.dto.CouponResponse;
import br.com.menufacil.dto.CouponValidationResponse;
import br.com.menufacil.dto.CreateCouponRequest;
import br.com.menufacil.repository.CouponRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CouponService {

    private final CouponRepository couponRepository;
    private final CouponConverter couponConverter;

    public List<CouponResponse> findAllByTenant(UUID tenantId) {
        return couponRepository.findByTenantId(tenantId).stream()
                .map(couponConverter::toResponse)
                .toList();
    }

    public CouponResponse findById(UUID id, UUID tenantId) {
        Coupon entity = couponRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cupom não encontrado"));
        validateTenant(entity, tenantId);
        return couponConverter.toResponse(entity);
    }

    @Transactional
    public CouponResponse create(UUID tenantId, CreateCouponRequest request) {
        couponRepository.findByCodeAndTenantId(request.getCode(), tenantId)
                .ifPresent(c -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Já existe um cupom com este código");
                });

        Coupon entity = couponConverter.toEntity(request);
        entity.setTenantId(tenantId);
        entity = couponRepository.save(entity);
        log.info("Cupom criado: {} no tenant {}", entity.getCode(), tenantId);
        return couponConverter.toResponse(entity);
    }

    @Transactional
    public CouponResponse update(UUID id, UUID tenantId, CreateCouponRequest request) {
        Coupon entity = couponRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cupom não encontrado"));
        validateTenant(entity, tenantId);
        couponConverter.updateFromRequest(request, entity);
        entity = couponRepository.save(entity);
        log.info("Cupom atualizado: {} no tenant {}", entity.getCode(), tenantId);
        return couponConverter.toResponse(entity);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Coupon entity = couponRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cupom não encontrado"));
        validateTenant(entity, tenantId);
        couponRepository.delete(entity);
        log.info("Cupom removido: {} no tenant {}", id, tenantId);
    }

    @Transactional
    public CouponValidationResponse validateCoupon(String code, UUID tenantId, BigDecimal orderTotal) {
        Coupon coupon = couponRepository.findByCodeAndTenantId(code, tenantId)
                .orElse(null);

        if (coupon == null) {
            return CouponValidationResponse.builder()
                    .valid(false)
                    .message("Cupom não encontrado")
                    .build();
        }

        if (!coupon.isActive()) {
            return CouponValidationResponse.builder()
                    .valid(false)
                    .message("Cupom inativo")
                    .build();
        }

        LocalDateTime now = LocalDateTime.now();
        if (coupon.getValidFrom() != null && now.isBefore(coupon.getValidFrom())) {
            return CouponValidationResponse.builder()
                    .valid(false)
                    .message("Cupom ainda não está válido")
                    .build();
        }

        if (coupon.getValidTo() != null && now.isAfter(coupon.getValidTo())) {
            return CouponValidationResponse.builder()
                    .valid(false)
                    .message("Cupom expirado")
                    .build();
        }

        if (coupon.getMaxUses() > 0 && coupon.getCurrentUses() >= coupon.getMaxUses()) {
            return CouponValidationResponse.builder()
                    .valid(false)
                    .message("Cupom atingiu o limite de usos")
                    .build();
        }

        if (coupon.getMinOrderValue() != null && orderTotal.compareTo(coupon.getMinOrderValue()) < 0) {
            return CouponValidationResponse.builder()
                    .valid(false)
                    .message("Valor mínimo do pedido não atingido: R$ " + coupon.getMinOrderValue())
                    .build();
        }

        BigDecimal discountAmount;
        if ("percent".equals(coupon.getDiscountType())) {
            discountAmount = orderTotal.multiply(coupon.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else {
            discountAmount = coupon.getDiscountValue();
        }

        coupon.setCurrentUses(coupon.getCurrentUses() + 1);
        couponRepository.save(coupon);

        log.info("Cupom validado: {} no tenant {}, desconto: {}", code, tenantId, discountAmount);

        return CouponValidationResponse.builder()
                .valid(true)
                .message("Cupom válido")
                .discountAmount(discountAmount)
                .discountType(coupon.getDiscountType())
                .build();
    }

    private void validateTenant(Coupon entity, UUID tenantId) {
        if (!entity.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
