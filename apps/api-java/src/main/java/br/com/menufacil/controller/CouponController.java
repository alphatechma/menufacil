package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.*;
import br.com.menufacil.service.CouponService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Tag(name = "Cupons", description = "Gerenciamento de cupons de desconto")
@RestController
@RequestMapping("/coupons")
@RequiredArgsConstructor
public class CouponController {

    private final CouponService couponService;

    @Operation(summary = "Listar todos os cupons do tenant")
    @GetMapping
    public ResponseEntity<List<CouponResponse>> listAll() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(couponService.findAllByTenant(tenantId));
    }

    @Operation(summary = "Buscar cupom por ID")
    @GetMapping("/{id}")
    public ResponseEntity<CouponResponse> findById(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(couponService.findById(id, tenantId));
    }

    @Operation(summary = "Criar cupom")
    @PostMapping
    public ResponseEntity<CouponResponse> create(@Valid @RequestBody CreateCouponRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(couponService.create(tenantId, request));
    }

    @Operation(summary = "Atualizar cupom")
    @PutMapping("/{id}")
    public ResponseEntity<CouponResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCouponRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(couponService.update(id, tenantId, request));
    }

    @Operation(summary = "Remover cupom")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        couponService.delete(id, tenantId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Validar cupom de desconto")
    @PostMapping("/validate")
    public ResponseEntity<CouponValidationResponse> validate(@Valid @RequestBody ValidateCouponRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(couponService.validateCoupon(
                request.getCode(), tenantId, request.getOrderTotal()));
    }

    private UUID TenantContext.getRequiredTenantUUID() {
        String tenantIdStr = TenantContext.getCurrentId();
        if (tenantIdStr == null || tenantIdStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Header X-Tenant-Slug é obrigatório");
        }
        return UUID.fromString(tenantIdStr);
    }
}
