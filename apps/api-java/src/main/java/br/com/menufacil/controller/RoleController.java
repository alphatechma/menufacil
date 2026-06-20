package br.com.menufacil.controller;

import br.com.menufacil.config.security.RequirePermissions;
import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateRoleRequest;
import br.com.menufacil.dto.PermissionResponse;
import br.com.menufacil.dto.RoleResponse;
import br.com.menufacil.service.RoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Cargos", description = "Gerenciamento de cargos e permissões do tenant")
@RestController
@RequestMapping("/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @Operation(summary = "Listar cargos do tenant")
    @RequirePermissions("roles:read")
    @GetMapping
    public ResponseEntity<List<RoleResponse>> findAll() {
        return ResponseEntity.ok(roleService.findAllByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Listar todas as permissões disponíveis")
    @RequirePermissions("roles:read")
    @GetMapping("/permissions")
    public ResponseEntity<List<PermissionResponse>> findPermissions() {
        return ResponseEntity.ok(roleService.findAllPermissions());
    }

    @Operation(summary = "Buscar cargo por ID")
    @RequirePermissions("roles:read")
    @GetMapping("/{id}")
    public ResponseEntity<RoleResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(roleService.findById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar um novo cargo customizado")
    @RequirePermissions("roles:create")
    @PostMapping
    public ResponseEntity<RoleResponse> create(@Valid @RequestBody CreateRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(roleService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar um cargo customizado")
    @RequirePermissions("roles:update")
    @PutMapping("/{id}")
    public ResponseEntity<RoleResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateRoleRequest request) {
        return ResponseEntity.ok(roleService.update(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Remover um cargo customizado")
    @RequirePermissions("roles:delete")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        roleService.delete(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }
}
