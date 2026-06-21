package br.com.menufacil.service;

import br.com.menufacil.converter.CouponConverter;
import br.com.menufacil.domain.models.Coupon;
import br.com.menufacil.dto.CouponResponse;
import br.com.menufacil.dto.CouponValidationResponse;
import br.com.menufacil.dto.CreateCouponRequest;
import br.com.menufacil.repository.CouponRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CouponService {

    private final CouponRepository couponRepository;
    private final CouponConverter couponConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("code", entity.getCode());
            details.put("discountType", entity.getDiscountType());
            details.put("discountValue", entity.getDiscountValue());
            details.put("maxUses", entity.getMaxUses());
            details.put("active", entity.isActive());
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "coupon",
                    entity.getId(),
                    entity.getCode(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de criação de cupom: {}", e.getMessage());
        }

        return couponConverter.toResponse(entity);
    }

    @Transactional
    public CouponResponse update(UUID id, UUID tenantId, CreateCouponRequest request) {
        Coupon entity = couponRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cupom não encontrado"));
        validateTenant(entity, tenantId);

        String oldCode = entity.getCode();
        String oldDiscountType = entity.getDiscountType();
        BigDecimal oldDiscountValue = entity.getDiscountValue();
        boolean oldActive = entity.isActive();

        couponConverter.updateFromRequest(request, entity);
        entity = couponRepository.save(entity);
        log.info("Cupom atualizado: {} no tenant {}", entity.getCode(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldCode", oldCode);
            details.put("newCode", entity.getCode());
            details.put("oldDiscountType", oldDiscountType);
            details.put("newDiscountType", entity.getDiscountType());
            details.put("oldDiscountValue", oldDiscountValue);
            details.put("newDiscountValue", entity.getDiscountValue());
            details.put("oldActive", oldActive);
            details.put("newActive", entity.isActive());
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "coupon",
                    entity.getId(),
                    entity.getCode(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de atualização de cupom: {}", e.getMessage());
        }

        return couponConverter.toResponse(entity);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Coupon entity = couponRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cupom não encontrado"));
        validateTenant(entity, tenantId);

        UUID couponId = entity.getId();
        UUID couponTenantId = entity.getTenantId();
        String couponCode = entity.getCode();

        couponRepository.delete(entity);
        log.info("Cupom removido: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    couponTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "coupon",
                    couponId,
                    couponCode,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de remoção de cupom: {}", e.getMessage());
        }
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
