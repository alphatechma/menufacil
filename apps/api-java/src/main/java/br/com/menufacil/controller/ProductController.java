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
import org.springframework.web.server.ResponseStatusException;

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
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(productService.findActiveByTenant(tenantId));
    }

    @Operation(summary = "Listar todos os produtos do tenant (admin)")
    @GetMapping("/all")
    public ResponseEntity<List<ProductResponse>> listAll() {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(productService.findAllByTenant(tenantId));
    }

    @Operation(summary = "Buscar produto por ID")
    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> findById(@PathVariable UUID id) {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(productService.findById(id, tenantId));
    }

    @Operation(summary = "Criar produto (admin)")
    @PostMapping
    public ResponseEntity<ProductResponse> create(@Valid @RequestBody CreateProductRequest request) {
        UUID tenantId = getTenantId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(productService.create(tenantId, request));
    }

    @Operation(summary = "Atualizar produto (admin)")
    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateProductRequest request) {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(productService.update(id, tenantId, request));
    }

    @Operation(summary = "Remover produto (admin)")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID tenantId = getTenantId();
        productService.delete(id, tenantId);
        return ResponseEntity.noContent().build();
    }

    private UUID getTenantId() {
        String tenantIdStr = TenantContext.getCurrentId();
        if (tenantIdStr == null || tenantIdStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Header X-Tenant-Slug é obrigatório");
        }
        return UUID.fromString(tenantIdStr);
    }
}
