package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateDeliveryZoneRequest;
import br.com.menufacil.dto.DeliveryZoneResponse;
import br.com.menufacil.service.DeliveryZoneService;
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

@Tag(name = "Zonas de Entrega", description = "Gerenciamento de zonas de entrega")
@RestController
@RequestMapping("/delivery-zones")
@RequiredArgsConstructor
public class DeliveryZoneController {

    private final DeliveryZoneService deliveryZoneService;

    @Operation(summary = "Listar todas as zonas de entrega do tenant")
    @GetMapping
    public ResponseEntity<List<DeliveryZoneResponse>> listAll() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(deliveryZoneService.findAllByTenant(tenantId));
    }

    @Operation(summary = "Buscar zona de entrega por ID")
    @GetMapping("/{id}")
    public ResponseEntity<DeliveryZoneResponse> findById(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(deliveryZoneService.findById(id, tenantId));
    }

    @Operation(summary = "Criar zona de entrega")
    @PostMapping
    public ResponseEntity<DeliveryZoneResponse> create(@Valid @RequestBody CreateDeliveryZoneRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(deliveryZoneService.create(tenantId, request));
    }

    @Operation(summary = "Atualizar zona de entrega")
    @PutMapping("/{id}")
    public ResponseEntity<DeliveryZoneResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateDeliveryZoneRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(deliveryZoneService.update(id, tenantId, request));
    }

    @Operation(summary = "Remover zona de entrega")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        deliveryZoneService.delete(id, tenantId);
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
