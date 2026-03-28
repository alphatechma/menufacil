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
        return ResponseEntity.ok(reservationService.findAllByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar reserva por ID")
    @GetMapping("/{id}")
    public ResponseEntity<ReservationResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(reservationService.findById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar reserva")
    @PostMapping
    public ResponseEntity<ReservationResponse> create(
            @Valid @RequestBody CreateReservationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservationService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar reserva")
    @PutMapping("/{id}")
    public ResponseEntity<ReservationResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateReservationRequest request) {
        return ResponseEntity.ok(reservationService.update(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar status da reserva")
    @PutMapping("/{id}/status")
    public ResponseEntity<ReservationResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateReservationStatusRequest request) {
        return ResponseEntity.ok(reservationService.updateStatus(id, TenantContext.getRequiredTenantUUID(), request.getStatus()));
    }

    @Operation(summary = "Remover reserva")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        reservationService.delete(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }
}
