package br.com.menufacil.controller;

import br.com.menufacil.config.security.RequirePermissions;
import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.AbandonedCartResponse;
import br.com.menufacil.dto.AbandonedCartStatsResponse;
import br.com.menufacil.dto.SaveAbandonedCartRequest;
import br.com.menufacil.service.AbandonedCartService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@Tag(name = "Carrinhos Abandonados", description = "Gerenciamento e recuperação de carrinhos abandonados")
@RestController
@RequestMapping("/abandoned-carts")
@RequiredArgsConstructor
public class AbandonedCartController {

    private final AbandonedCartService abandonedCartService;

    @Operation(summary = "Salvar carrinho atual do cliente (público — upsert)")
    @PostMapping("/save")
    public ResponseEntity<AbandonedCartResponse> save(@Valid @RequestBody SaveAbandonedCartRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(abandonedCartService.saveCart(tenantId, request));
    }

    @Operation(summary = "Recuperar último carrinho não-recuperado do cliente (público)")
    @GetMapping("/recover")
    public ResponseEntity<AbandonedCartResponse> recover(@RequestParam("customerId") UUID customerId) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        Optional<AbandonedCartResponse> cart = abandonedCartService.getRecoverableCart(tenantId, customerId);
        return cart.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @Operation(summary = "Listar carrinhos abandonados do tenant (admin)")
    @RequirePermissions("customer:read")
    @GetMapping
    public ResponseEntity<Page<AbandonedCartResponse>> findAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(abandonedCartService.findAll(tenantId, page, limit));
    }

    @Operation(summary = "Estatísticas de recuperação de carrinhos (admin)")
    @RequirePermissions("customer:read")
    @GetMapping("/stats")
    public ResponseEntity<AbandonedCartStatsResponse> getStats() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(abandonedCartService.getStats(tenantId));
    }
}
