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
        return ResponseEntity.ok(loyaltyService.findAllRewardsByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Listar recompensas ativas do tenant")
    @GetMapping("/rewards/active")
    public ResponseEntity<List<LoyaltyRewardResponse>> listActiveRewards() {
        return ResponseEntity.ok(loyaltyService.findActiveRewardsByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar recompensa por ID")
    @GetMapping("/rewards/{id}")
    public ResponseEntity<LoyaltyRewardResponse> findRewardById(@PathVariable UUID id) {
        return ResponseEntity.ok(loyaltyService.findRewardById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar recompensa")
    @PostMapping("/rewards")
    public ResponseEntity<LoyaltyRewardResponse> createReward(@Valid @RequestBody CreateLoyaltyRewardRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(loyaltyService.createReward(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar recompensa")
    @PutMapping("/rewards/{id}")
    public ResponseEntity<LoyaltyRewardResponse> updateReward(
            @PathVariable UUID id,
            @Valid @RequestBody CreateLoyaltyRewardRequest request) {
        return ResponseEntity.ok(loyaltyService.updateReward(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Remover recompensa")
    @DeleteMapping("/rewards/{id}")
    public ResponseEntity<Void> deleteReward(@PathVariable UUID id) {
        loyaltyService.deleteReward(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }

    // ---- Redemptions ----

    @Operation(summary = "Resgatar recompensa (customer)")
    @PostMapping("/redeem")
    public ResponseEntity<LoyaltyRedemptionResponse> redeem(@Valid @RequestBody RedeemRewardRequest request) {
        // TODO: Extrair customerId do token JWT do customer autenticado
        // Por enquanto recebe via header temporário
        UUID customerId = getCustomerIdFromHeader();
        UUID rewardId = UUID.fromString(request.getRewardId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(loyaltyService.redeemReward(customerId, rewardId, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Listar resgates do customer autenticado")
    @GetMapping("/my-redemptions")
    public ResponseEntity<List<LoyaltyRedemptionResponse>> myRedemptions() {
        UUID customerId = getCustomerIdFromHeader();
        return ResponseEntity.ok(loyaltyService.findRedemptionsByCustomer(customerId, TenantContext.getRequiredTenantUUID()));
    }

    private UUID getCustomerIdFromHeader() {
        // TODO: Substituir por extração do JWT quando auth de customer estiver migrado
        throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED,
                "Autenticação de customer ainda não migrada. Use o header X-Customer-Id temporariamente.");
    }
}
