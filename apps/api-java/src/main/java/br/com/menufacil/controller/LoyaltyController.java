package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.*;
import br.com.menufacil.service.LoyaltyService;
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

@Tag(name = "Fidelidade", description = "Gerenciamento de programa de fidelidade")
@RestController
@RequestMapping("/loyalty")
@RequiredArgsConstructor
public class LoyaltyController {

    private final LoyaltyService loyaltyService;

    // ---- Rewards CRUD ----

    @Operation(summary = "Listar todas as recompensas do tenant")
    @GetMapping("/rewards")
    public ResponseEntity<List<LoyaltyRewardResponse>> listRewards() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(loyaltyService.findAllRewardsByTenant(tenantId));
    }

    @Operation(summary = "Listar recompensas ativas do tenant")
    @GetMapping("/rewards/active")
    public ResponseEntity<List<LoyaltyRewardResponse>> listActiveRewards() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(loyaltyService.findActiveRewardsByTenant(tenantId));
    }

    @Operation(summary = "Buscar recompensa por ID")
    @GetMapping("/rewards/{id}")
    public ResponseEntity<LoyaltyRewardResponse> findRewardById(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(loyaltyService.findRewardById(id, tenantId));
    }

    @Operation(summary = "Criar recompensa")
    @PostMapping("/rewards")
    public ResponseEntity<LoyaltyRewardResponse> createReward(@Valid @RequestBody CreateLoyaltyRewardRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(loyaltyService.createReward(tenantId, request));
    }

    @Operation(summary = "Atualizar recompensa")
    @PutMapping("/rewards/{id}")
    public ResponseEntity<LoyaltyRewardResponse> updateReward(
            @PathVariable UUID id,
            @Valid @RequestBody CreateLoyaltyRewardRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(loyaltyService.updateReward(id, tenantId, request));
    }

    @Operation(summary = "Remover recompensa")
    @DeleteMapping("/rewards/{id}")
    public ResponseEntity<Void> deleteReward(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        loyaltyService.deleteReward(id, tenantId);
        return ResponseEntity.noContent().build();
    }

    // ---- Redemptions ----

    @Operation(summary = "Resgatar recompensa (customer)")
    @PostMapping("/redeem")
    public ResponseEntity<LoyaltyRedemptionResponse> redeem(@Valid @RequestBody RedeemRewardRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        // TODO: Extrair customerId do token JWT do customer autenticado
        // Por enquanto recebe via header temporário
        UUID customerId = getCustomerIdFromHeader();
        UUID rewardId = UUID.fromString(request.getRewardId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(loyaltyService.redeemReward(customerId, rewardId, tenantId));
    }

    @Operation(summary = "Listar resgates do customer autenticado")
    @GetMapping("/my-redemptions")
    public ResponseEntity<List<LoyaltyRedemptionResponse>> myRedemptions() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        UUID customerId = getCustomerIdFromHeader();
        return ResponseEntity.ok(loyaltyService.findRedemptionsByCustomer(customerId, tenantId));
    }

    private UUID TenantContext.getRequiredTenantUUID() {
        String tenantIdStr = TenantContext.getCurrentId();
        if (tenantIdStr == null || tenantIdStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Header X-Tenant-Slug é obrigatório");
        }
        return UUID.fromString(tenantIdStr);
    }

    private UUID getCustomerIdFromHeader() {
        // TODO: Substituir por extração do JWT quando auth de customer estiver migrado
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED,
                "Autenticação de customer ainda não migrada. Use o header X-Customer-Id temporariamente.");
    }
}
