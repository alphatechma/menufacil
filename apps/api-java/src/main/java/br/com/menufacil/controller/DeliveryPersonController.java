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
        return ResponseEntity.ok(deliveryPersonService.findAllByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Listar entregadores ativos do tenant")
    @GetMapping("/active")
    public ResponseEntity<List<DeliveryPersonResponse>> listActive() {
        return ResponseEntity.ok(deliveryPersonService.findActiveByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar entregador por ID")
    @GetMapping("/{id}")
    public ResponseEntity<DeliveryPersonResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(deliveryPersonService.findById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar entregador")
    @PostMapping
    public ResponseEntity<DeliveryPersonResponse> create(@Valid @RequestBody CreateDeliveryPersonRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(deliveryPersonService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar entregador")
    @PutMapping("/{id}")
    public ResponseEntity<DeliveryPersonResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateDeliveryPersonRequest request) {
        return ResponseEntity.ok(deliveryPersonService.update(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Remover entregador")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        deliveryPersonService.delete(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }
}
