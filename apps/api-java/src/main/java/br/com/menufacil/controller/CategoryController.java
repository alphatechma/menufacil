package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CategoryResponse;
import br.com.menufacil.dto.CreateCategoryRequest;
import br.com.menufacil.service.CategoryService;
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

@Tag(name = "Categorias", description = "Gerenciamento de categorias")
@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @Operation(summary = "Listar categorias ativas do tenant (público)")
    @GetMapping
    public ResponseEntity<List<CategoryResponse>> listActive() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(categoryService.findActiveByTenant(tenantId));
    }

    @Operation(summary = "Listar todas as categorias do tenant (admin)")
    @GetMapping("/all")
    public ResponseEntity<List<CategoryResponse>> listAll() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(categoryService.findAllByTenant(tenantId));
    }

    @Operation(summary = "Criar categoria (admin)")
    @PostMapping
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CreateCategoryRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.create(tenantId, request));
    }

    @Operation(summary = "Atualizar categoria (admin)")
    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCategoryRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(categoryService.update(id, tenantId, request));
    }

    @Operation(summary = "Remover categoria (admin)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        categoryService.delete(id, tenantId);
        return ResponseEntity.noContent().build();
    }

    private UUID TenantContext.getRequiredTenantUUID() {
        String tenantIdStr = TenantContext.getCurrentId();
        if (tenantIdStr == null || tenantIdStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Header X-Tenant-Slug é obrigatório");
        }
        return UUID.fromString(tenantIdStr);
    }
}
