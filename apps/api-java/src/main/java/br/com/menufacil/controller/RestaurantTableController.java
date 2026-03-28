package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateRestaurantTableRequest;
import br.com.menufacil.dto.RestaurantTableResponse;
import br.com.menufacil.dto.TableSessionResponse;
import br.com.menufacil.service.RestaurantTableService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Mesas", description = "Gerenciamento de mesas do restaurante")
@RestController
@RequestMapping("/tables")
@RequiredArgsConstructor
public class RestaurantTableController {

    private final RestaurantTableService tableService;

    @Operation(summary = "Listar todas as mesas do tenant")
    @GetMapping
    public ResponseEntity<List<RestaurantTableResponse>> listAll() {
        return ResponseEntity.ok(tableService.findAllByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar mesa por ID")
    @GetMapping("/{id}")
    public ResponseEntity<RestaurantTableResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(tableService.findById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar mesa")
    @PostMapping
    public ResponseEntity<RestaurantTableResponse> create(
            @Valid @RequestBody CreateRestaurantTableRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(tableService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar mesa")
    @PutMapping("/{id}")
    public ResponseEntity<RestaurantTableResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateRestaurantTableRequest request) {
        return ResponseEntity.ok(tableService.update(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Remover mesa")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        tableService.delete(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }

    // ---- Table Sessions ----

    @Operation(summary = "Listar sessões de uma mesa")
    @GetMapping("/{tableId}/sessions")
    public ResponseEntity<List<TableSessionResponse>> listSessions(@PathVariable UUID tableId) {
        return ResponseEntity.ok(tableService.findSessionsByTable(tableId, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Abrir sessão em uma mesa")
    @PostMapping("/{tableId}/sessions")
    public ResponseEntity<TableSessionResponse> openSession(@PathVariable UUID tableId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(tableService.openSession(tableId, TenantContext.getRequiredTenantUUID()));
    }
}
