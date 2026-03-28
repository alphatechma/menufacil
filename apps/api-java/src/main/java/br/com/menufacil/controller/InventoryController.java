package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.*;
import br.com.menufacil.service.InventoryService;
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

@Tag(name = "Estoque", description = "Gerenciamento de estoque e movimentações")
@RestController
@RequestMapping("/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    // ---- Items CRUD ----

    @Operation(summary = "Listar todos os itens de estoque do tenant")
    @GetMapping("/items")
    public ResponseEntity<List<InventoryItemResponse>> listAll() {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(inventoryService.findAllByTenant(tenantId));
    }

    @Operation(summary = "Buscar item de estoque por ID")
    @GetMapping("/items/{id}")
    public ResponseEntity<InventoryItemResponse> findById(@PathVariable UUID id) {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(inventoryService.findById(id, tenantId));
    }

    @Operation(summary = "Criar item de estoque")
    @PostMapping("/items")
    public ResponseEntity<InventoryItemResponse> create(@Valid @RequestBody CreateInventoryItemRequest request) {
        UUID tenantId = getTenantId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inventoryService.create(tenantId, request));
    }

    @Operation(summary = "Atualizar item de estoque")
    @PutMapping("/items/{id}")
    public ResponseEntity<InventoryItemResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateInventoryItemRequest request) {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(inventoryService.update(id, tenantId, request));
    }

    @Operation(summary = "Remover item de estoque")
    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID tenantId = getTenantId();
        inventoryService.delete(id, tenantId);
        return ResponseEntity.noContent().build();
    }

    // ---- Low Stock ----

    @Operation(summary = "Listar itens com estoque baixo")
    @GetMapping("/items/low-stock")
    public ResponseEntity<List<InventoryItemResponse>> lowStock() {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(inventoryService.getLowStockItems(tenantId));
    }

    // ---- Movements ----

    @Operation(summary = "Registrar movimentação de estoque")
    @PostMapping("/movements")
    public ResponseEntity<StockMovementResponse> createMovement(@Valid @RequestBody CreateStockMovementRequest request) {
        UUID tenantId = getTenantId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inventoryService.createMovement(tenantId, request));
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
