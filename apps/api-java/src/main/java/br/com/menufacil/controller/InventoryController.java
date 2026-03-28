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
        return ResponseEntity.ok(inventoryService.findAllByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar item de estoque por ID")
    @GetMapping("/items/{id}")
    public ResponseEntity<InventoryItemResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(inventoryService.findById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar item de estoque")
    @PostMapping("/items")
    public ResponseEntity<InventoryItemResponse> create(@Valid @RequestBody CreateInventoryItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inventoryService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar item de estoque")
    @PutMapping("/items/{id}")
    public ResponseEntity<InventoryItemResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateInventoryItemRequest request) {
        return ResponseEntity.ok(inventoryService.update(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Remover item de estoque")
    @DeleteMapping("/items/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        inventoryService.delete(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }

    // ---- Low Stock ----

    @Operation(summary = "Listar itens com estoque baixo")
    @GetMapping("/items/low-stock")
    public ResponseEntity<List<InventoryItemResponse>> lowStock() {
        return ResponseEntity.ok(inventoryService.getLowStockItems(TenantContext.getRequiredTenantUUID()));
    }

    // ---- Movements ----

    @Operation(summary = "Registrar movimentação de estoque")
    @PostMapping("/movements")
    public ResponseEntity<StockMovementResponse> createMovement(@Valid @RequestBody CreateStockMovementRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(inventoryService.createMovement(TenantContext.getRequiredTenantUUID(), request));
    }
}
