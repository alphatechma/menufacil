package br.com.menufacil.controller;

import br.com.menufacil.dto.*;
import br.com.menufacil.service.SuperAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Tag(name = "Super Admin", description = "Painel de administração geral da plataforma")
@RestController
@RequestMapping("/super-admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SuperAdminController {

    private final SuperAdminService superAdminService;

    @Operation(summary = "Estatísticas do dashboard")
    @GetMapping("/dashboard/stats")
    public ResponseEntity<SuperAdminStatsResponse> getDashboardStats() {
        return ResponseEntity.ok(superAdminService.getDashboardStats());
    }

    @Operation(summary = "Listar tenants com filtros e paginação")
    @GetMapping("/tenants")
    public ResponseEntity<Page<TenantListResponse>> listTenants(
            @RequestParam(required = false) String search,
            @RequestParam(required = false, name = "is_active") Boolean isActive,
            @RequestParam(required = false, defaultValue = "false") boolean deleted,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(superAdminService.listTenants(search, isActive, deleted, page, limit));
    }

    @Operation(summary = "Detalhe de um tenant com usuários")
    @GetMapping("/tenants/{id}")
    public ResponseEntity<TenantDetailResponse> getTenantDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(superAdminService.getTenantDetail(id));
    }

    @Operation(summary = "Criar tenant com usuário admin")
    @PostMapping("/tenants")
    public ResponseEntity<TenantDetailResponse> createTenantWithAdmin(
            @Valid @RequestBody CreateTenantWithAdminRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(superAdminService.createTenantWithAdmin(request));
    }

    @Operation(summary = "Atualizar tenant")
    @PutMapping("/tenants/{id}")
    public ResponseEntity<TenantDetailResponse> updateTenant(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTenantRequest request) {
        return ResponseEntity.ok(superAdminService.updateTenant(id, request));
    }

    @Operation(summary = "Ativar/desativar tenant")
    @PatchMapping("/tenants/{id}/toggle-active")
    public ResponseEntity<TenantDetailResponse> toggleActive(@PathVariable UUID id) {
        return ResponseEntity.ok(superAdminService.toggleActive(id));
    }

    @Operation(summary = "Soft delete de tenant")
    @DeleteMapping("/tenants/{id}")
    public ResponseEntity<Void> softDelete(@PathVariable UUID id) {
        superAdminService.softDelete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Remoção permanente de tenant")
    @DeleteMapping("/tenants/{id}/permanent")
    public ResponseEntity<Void> hardDelete(@PathVariable UUID id) {
        superAdminService.hardDelete(id);
        return ResponseEntity.noContent().build();
    }
}
