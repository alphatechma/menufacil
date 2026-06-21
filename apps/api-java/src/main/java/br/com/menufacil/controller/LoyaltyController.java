package br.com.menufacil.controller;

import br.com.menufacil.config.security.RequirePermissions;
import br.com.menufacil.config.security.SecurityContextHelper;
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
    @RequirePermissions("loyalty:read")
    @GetMapping("/rewards")
    public ResponseEntity<List<LoyaltyRewardResponse>> listRewards() {
        return ResponseEntity.ok(loyaltyService.findAllRewardsByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Listar recompensas ativas do tenant")
    @RequirePermissions("loyalty:read")
    @GetMapping("/rewards/active")
    public ResponseEntity<List<LoyaltyRewardResponse>> listActiveRewards() {
        return ResponseEntity.ok(loyaltyService.findActiveRewardsByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar recompensa por ID")
    @RequirePermissions("loyalty:read")
    @GetMapping("/rewards/{id}")
    public ResponseEntity<LoyaltyRewardResponse> findRewardById(@PathVariable UUID id) {
        return ResponseEntity.ok(loyaltyService.findRewardById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar recompensa")
    @RequirePermissions("loyalty:create")
    @PostMapping("/rewards")
    public ResponseEntity<LoyaltyRewardResponse> createReward(@Valid @RequestBody CreateLoyaltyRewardRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(loyaltyService.createReward(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar recompensa")
    @RequirePermissions("loyalty:update")
    @PutMapping("/rewards/{id}")
    public ResponseEntity<LoyaltyRewardResponse> updateReward(
            @PathVariable UUID id,
            @Valid @RequestBody CreateLoyaltyRewardRequest request) {
        return ResponseEntity.ok(loyaltyService.updateReward(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Remover recompensa")
    @RequirePermissions("loyalty:delete")
    @DeleteMapping("/rewards/{id}")
    public ResponseEntity<Void> deleteReward(@PathVariable UUID id) {
        loyaltyService.deleteReward(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }

    // ---- Redemptions ----

    @Operation(summary = "Resgatar recompensa (customer)")
    @PostMapping("/redeem")
    public ResponseEntity<LoyaltyRedemptionResponse> redeem(
            @Valid @RequestBody RedeemRewardRequest request,
            @RequestHeader(value = "X-Customer-Id", required = false) String customerIdHeader) {
        UUID customerId = getCurrentCustomerId(customerIdHeader);
        UUID rewardId = UUID.fromString(request.getRewardId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(loyaltyService.redeemReward(customerId, rewardId, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Listar resgates do customer autenticado")
    @GetMapping("/my-redemptions")
    public ResponseEntity<List<LoyaltyRedemptionResponse>> myRedemptions(
            @RequestHeader(value = "X-Customer-Id", required = false) String customerIdHeader) {
        UUID customerId = getCurrentCustomerId(customerIdHeader);
        return ResponseEntity.ok(loyaltyService.findRedemptionsByCustomer(customerId, TenantContext.getRequiredTenantUUID()));
    }

    /**
     * Resolve o customerId logado.
     *
     * Estrategia:
     *   1. Tenta extrair do JWT atual via {@link SecurityContextHelper#getCurrentCustomerId()}.
     *   2. Fallback: aceita o header {@code X-Customer-Id} para backwards-compat
     *      enquanto o frontend / clientes externos migram para o novo JWT.
     *
     * TODO: remover o fallback de header assim que todos os consumidores estiverem
     * emitindo o JWT de customer com o claim {@code customerId} (deadline alvo: proximo release).
     */
    private UUID getCurrentCustomerId(String customerIdHeader) {
        return SecurityContextHelper.getCurrentCustomerId()
                .orElseGet(() -> parseHeaderFallback(customerIdHeader));
    }

    private UUID parseHeaderFallback(String customerIdHeader) {
        if (customerIdHeader == null || customerIdHeader.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Cliente não autenticado (JWT sem customerId e header X-Customer-Id ausente)");
        }
        try {
            return UUID.fromString(customerIdHeader.trim());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "X-Customer-Id inválido");
        }
    }
}
