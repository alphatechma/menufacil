package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateProductRequest;
import br.com.menufacil.dto.ProductResponse;
import br.com.menufacil.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Produtos", description = "Gerenciamento de produtos")
@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @Operation(summary = "Listar produtos ativos do tenant (público)")
    @GetMapping
    public ResponseEntity<List<ProductResponse>> listActive() {
        return ResponseEntity.ok(productService.findActiveByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Listar todos os produtos do tenant (admin)")
    @GetMapping("/all")
    public ResponseEntity<List<ProductResponse>> listAll() {
        return ResponseEntity.ok(productService.findAllByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar produto por ID")
    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(productService.findById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar produto (admin)")
    @PostMapping
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody CreateProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(productService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar produto (admin)")
    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateProductRequest request) {
        return ResponseEntity.ok(productService.update(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Remover produto (admin)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        productService.delete(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }
}
