package br.com.menufacil.controller;

import br.com.menufacil.config.security.RequirePermissions;
import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateFloorPlanRequest;
import br.com.menufacil.dto.FloorPlanResponse;
import br.com.menufacil.service.FloorPlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Mapas do Salão", description = "Gerenciamento dos mapas (floor plans) do salão")
@RestController
@RequestMapping("/floor-plans")
@RequiredArgsConstructor
public class FloorPlanController {

    private final FloorPlanService floorPlanService;

    @Operation(summary = "Listar mapas do salão do tenant (opcionalmente filtrando por unidade)")
    @RequirePermissions("order:read")
    @GetMapping
    public ResponseEntity<List<FloorPlanResponse>> list(
            @RequestParam(value = "unitId", required = false) UUID unitId) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(floorPlanService.findByTenant(tenantId, unitId));
    }

    @Operation(summary = "Buscar mapa do salão por ID")
    @RequirePermissions("order:read")
    @GetMapping("/{id}")
    public ResponseEntity<FloorPlanResponse> findById(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(floorPlanService.findById(id, tenantId));
    }

    @Operation(summary = "Criar mapa do salão")
    @RequirePermissions("order:update")
    @PostMapping
    public ResponseEntity<FloorPlanResponse> create(@Valid @RequestBody CreateFloorPlanRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(floorPlanService.create(tenantId, request));
    }

    @Operation(summary = "Atualizar mapa do salão")
    @RequirePermissions("order:update")
    @PatchMapping("/{id}")
    public ResponseEntity<FloorPlanResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateFloorPlanRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(floorPlanService.update(id, tenantId, request));
    }

    @Operation(summary = "Remover mapa do salão")
    @RequirePermissions("order:update")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        floorPlanService.delete(id, tenantId);
        return ResponseEntity.noContent().build();
    }
}
