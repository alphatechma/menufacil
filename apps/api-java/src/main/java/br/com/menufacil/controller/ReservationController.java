package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateReservationRequest;
import br.com.menufacil.dto.ReservationResponse;
import br.com.menufacil.dto.UpdateReservationStatusRequest;
import br.com.menufacil.service.ReservationService;
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

@Tag(name = "Reservas", description = "Gerenciamento de reservas")
@RestController
@RequestMapping("/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @Operation(summary = "Listar todas as reservas do tenant")
    @GetMapping
    public ResponseEntity<List<ReservationResponse>> listAll() {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(reservationService.findAllByTenant(tenantId));
    }

    @Operation(summary = "Buscar reserva por ID")
    @GetMapping("/{id}")
    public ResponseEntity<ReservationResponse> findById(@PathVariable UUID id) {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(reservationService.findById(id, tenantId));
    }

    @Operation(summary = "Criar reserva")
    @PostMapping
    public ResponseEntity<ReservationResponse> create(
            @Valid @RequestBody CreateReservationRequest request) {
        UUID tenantId = getTenantId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservationService.create(tenantId, request));
    }

    @Operation(summary = "Atualizar reserva")
    @PutMapping("/{id}")
    public ResponseEntity<ReservationResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateReservationRequest request) {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(reservationService.update(id, tenantId, request));
    }

    @Operation(summary = "Atualizar status da reserva")
    @PutMapping("/{id}/status")
    public ResponseEntity<ReservationResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateReservationStatusRequest request) {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(reservationService.updateStatus(id, tenantId, request.getStatus()));
    }

    @Operation(summary = "Remover reserva")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID tenantId = getTenantId();
        reservationService.delete(id, tenantId);
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
