package br.com.menufacil.controller;

import br.com.menufacil.config.security.RequirePermissions;
import br.com.menufacil.dto.CreatePermissionRequest;
import br.com.menufacil.dto.PermissionResponse;
import br.com.menufacil.service.PermissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Super Admin - Permissões", description = "Gerenciamento global de permissões")
@RestController
@RequestMapping("/super-admin/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionService permissionService;

    @Operation(summary = "Listar permissões (filtra opcionalmente por módulo)")
    @RequirePermissions("permissions:read")
    @GetMapping
    public ResponseEntity<List<PermissionResponse>> findAll(
            @RequestParam(value = "module_id", required = false) UUID moduleId) {
        return ResponseEntity.ok(permissionService.findAll(moduleId));
    }

    @Operation(summary = "Buscar permissão por ID")
    @RequirePermissions("permissions:read")
    @GetMapping("/{id}")
    public ResponseEntity<PermissionResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(permissionService.findById(id));
    }

    @Operation(summary = "Criar permissão")
    @RequirePermissions("permissions:create")
    @PostMapping
    public ResponseEntity<PermissionResponse> create(@Valid @RequestBody CreatePermissionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(permissionService.create(request));
    }

    @Operation(summary = "Atualizar permissão")
    @RequirePermissions("permissions:update")
    @PutMapping("/{id}")
    public ResponseEntity<PermissionResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreatePermissionRequest request) {
        return ResponseEntity.ok(permissionService.update(id, request));
    }

    @Operation(summary = "Remover permissão")
    @RequirePermissions("permissions:delete")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        permissionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
