package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateCustomerRequest;
import br.com.menufacil.dto.CustomerResponse;
import br.com.menufacil.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Clientes", description = "Gerenciamento de clientes")
@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @Operation(summary = "Listar todos os clientes do tenant")
    @GetMapping
    public ResponseEntity<List<CustomerResponse>> listAll() {
        return ResponseEntity.ok(customerService.findAllByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar cliente por ID")
    @GetMapping("/{id}")
    public ResponseEntity<CustomerResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(customerService.findById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar cliente")
    @PostMapping
    public ResponseEntity<CustomerResponse> create(@Valid @RequestBody CreateCustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(customerService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar cliente")
    @PutMapping("/{id}")
    public ResponseEntity<CustomerResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCustomerRequest request) {
        return ResponseEntity.ok(customerService.update(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Remover cliente")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        customerService.delete(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }
}
