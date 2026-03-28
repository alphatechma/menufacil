package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateDeliveryPersonRequest;
import br.com.menufacil.dto.DeliveryPersonResponse;
import br.com.menufacil.service.DeliveryPersonService;
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

@Tag(name = "Entregadores", description = "Gerenciamento de entregadores")
@RestController
@RequestMapping("/delivery-persons")
@RequiredArgsConstructor
public class DeliveryPersonController {

    private final DeliveryPersonService deliveryPersonService;

    @Operation(summary = "Listar todos os entregadores do tenant")
    @GetMapping
    public ResponseEntity<List<DeliveryPersonResponse>> listAll() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(deliveryPersonService.findAllByTenant(tenantId));
    }

    @Operation(summary = "Listar entregadores ativos do tenant")
    @GetMapping("/active")
    public ResponseEntity<List<DeliveryPersonResponse>> listActive() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(deliveryPersonService.findActiveByTenant(tenantId));
    }

    @Operation(summary = "Buscar entregador por ID")
    @GetMapping("/{id}")
    public ResponseEntity<DeliveryPersonResponse> findById(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(deliveryPersonService.findById(id, tenantId));
    }

    @Operation(summary = "Criar entregador")
    @PostMapping
    public ResponseEntity<DeliveryPersonResponse> create(@Valid @RequestBody CreateDeliveryPersonRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(deliveryPersonService.create(tenantId, request));
    }

    @Operation(summary = "Atualizar entregador")
    @PutMapping("/{id}")
    public ResponseEntity<DeliveryPersonResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateDeliveryPersonRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(deliveryPersonService.update(id, tenantId, request));
    }

    @Operation(summary = "Remover entregador")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        deliveryPersonService.delete(id, tenantId);
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
