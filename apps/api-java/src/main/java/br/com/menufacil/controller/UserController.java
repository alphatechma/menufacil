package br.com.menufacil.controller;

import br.com.menufacil.config.security.RequirePermissions;
import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.ChangePasswordRequest;
import br.com.menufacil.dto.CreateUserRequest;
import br.com.menufacil.dto.UpdateUserRequest;
import br.com.menufacil.dto.UserResponse;
import br.com.menufacil.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Usuários", description = "Gerenciamento de usuários do tenant")
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "Listar usuários do tenant")
    @RequirePermissions("staff:read")
    @GetMapping
    public ResponseEntity<List<UserResponse>> findAll() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(userService.findAllByTenant(tenantId));
    }

    @Operation(summary = "Obter perfil do usuário autenticado")
    @GetMapping("/me")
    public ResponseEntity<UserResponse> findCurrentUser() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(userService.findCurrentUser(tenantId));
    }

    @Operation(summary = "Alterar a própria senha")
    @PutMapping("/me/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        userService.changeCurrentUserPassword(tenantId, request);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Detalhar usuário por ID")
    @RequirePermissions("staff:read")
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> findById(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(userService.findById(id, tenantId));
    }

    @Operation(summary = "Criar novo usuário")
    @RequirePermissions("staff:create")
    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody CreateUserRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userService.create(tenantId, request));
    }

    @Operation(summary = "Atualizar usuário")
    @RequirePermissions("staff:update")
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(userService.update(id, tenantId, request));
    }

    @Operation(summary = "Desativar usuário (soft delete)")
    @RequirePermissions("staff:delete")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        userService.delete(id, tenantId);
        return ResponseEntity.noContent().build();
    }
}
