package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.*;
import br.com.menufacil.service.PromotionService;
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

@Tag(name = "Promoções", description = "Gerenciamento de promoções")
@RestController
@RequestMapping("/promotions")
@RequiredArgsConstructor
public class PromotionController {

    private final PromotionService promotionService;

    @Operation(summary = "Listar todas as promoções do tenant")
    @GetMapping
    public ResponseEntity<List<PromotionResponse>> listAll() {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(promotionService.findAllByTenant(tenantId));
    }

    @Operation(summary = "Listar promoções ativas")
    @GetMapping("/active")
    public ResponseEntity<List<PromotionResponse>> listActive() {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(promotionService.getActivePromotions(tenantId));
    }

    @Operation(summary = "Buscar promoção por ID")
    @GetMapping("/{id}")
    public ResponseEntity<PromotionResponse> findById(@PathVariable UUID id) {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(promotionService.findById(id, tenantId));
    }

    @Operation(summary = "Criar promoção")
    @PostMapping
    public ResponseEntity<PromotionResponse> create(
            @Valid @RequestBody CreatePromotionRequest request) {
        UUID tenantId = getTenantId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(promotionService.create(tenantId, request));
    }

    @Operation(summary = "Atualizar promoção")
    @PutMapping("/{id}")
    public ResponseEntity<PromotionResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreatePromotionRequest request) {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(promotionService.update(id, tenantId, request));
    }

    @Operation(summary = "Remover promoção")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID tenantId = getTenantId();
        promotionService.delete(id, tenantId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Avaliar promoções aplicáveis ao carrinho")
    @PostMapping("/evaluate")
    public ResponseEntity<PromotionEvaluateResponse> evaluate(
            @RequestBody PromotionEvaluateRequest request) {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(promotionService.evaluateCart(tenantId, request));
    }

    private UUID getTenantId() {
        String tenantIdStr = TenantContext.getCurrentId();
        if (tenantIdStr == null || tenantIdStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Header X-Tenant-Slug é obrigatório");
        }
        return UUID.fromString(tenantIdStr);
    }
}
