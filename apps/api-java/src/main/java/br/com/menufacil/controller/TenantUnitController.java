package br.com.menufacil.controller;

import br.com.menufacil.config.security.RequirePermissions;
import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateTenantUnitRequest;
import br.com.menufacil.dto.TenantUnitResponse;
import br.com.menufacil.service.TenantUnitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Unidades", description = "Gerenciamento de unidades do tenant")
@RestController
@RequestMapping("/units")
@RequiredArgsConstructor
public class TenantUnitController {

    private final TenantUnitService tenantUnitService;

    @Operation(summary = "Listar unidades do tenant")
    @RequirePermissions("staff:read")
    @GetMapping
    public ResponseEntity<List<TenantUnitResponse>> findAll() {
        return ResponseEntity.ok(
                tenantUnitService.findAllByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar unidade por ID")
    @RequirePermissions("staff:read")
    @GetMapping("/{id}")
    public ResponseEntity<TenantUnitResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(
                tenantUnitService.findById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar nova unidade")
    @RequirePermissions("staff:create")
    @PostMapping
    public ResponseEntity<TenantUnitResponse> create(
            @Valid @RequestBody CreateTenantUnitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(tenantUnitService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar unidade existente")
    @RequirePermissions("staff:update")
    @PutMapping("/{id}")
    public ResponseEntity<TenantUnitResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateTenantUnitRequest request) {
        return ResponseEntity.ok(
                tenantUnitService.update(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Desativar unidade (soft delete)")
    @RequirePermissions("staff:delete")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        tenantUnitService.delete(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }
}
