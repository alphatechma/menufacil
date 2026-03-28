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
        return ResponseEntity.ok(categoryService.findActiveByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Listar todas as categorias do tenant (admin)")
    @GetMapping("/all")
    public ResponseEntity<List<CategoryResponse>> listAll() {
        return ResponseEntity.ok(categoryService.findAllByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar categoria (admin)")
    @PostMapping
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CreateCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(categoryService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar categoria (admin)")
    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCategoryRequest request) {
        return ResponseEntity.ok(categoryService.update(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Remover categoria (admin)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        categoryService.delete(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }
}
