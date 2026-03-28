package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateOrderRequest;
import br.com.menufacil.dto.OrderResponse;
import br.com.menufacil.dto.UpdateOrderStatusRequest;
import br.com.menufacil.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Pedidos", description = "Gerenciamento de pedidos")
@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @Operation(summary = "Listar pedidos do tenant (admin)")
    @GetMapping
    public ResponseEntity<List<OrderResponse>> list() {
        return ResponseEntity.ok(orderService.findByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar pedido por ID")
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(orderService.findById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar pedido (público/customer)")
    @PostMapping
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(orderService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar status do pedido (admin)")
    @PutMapping("/{id}/status")
    public ResponseEntity<OrderResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateOrderStatusRequest request) {
        return ResponseEntity.ok(orderService.updateStatus(id, TenantContext.getRequiredTenantUUID(), request));
    }
}
