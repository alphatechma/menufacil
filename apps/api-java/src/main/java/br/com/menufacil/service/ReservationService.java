package br.com.menufacil.service;

import br.com.menufacil.converter.ReservationConverter;
import br.com.menufacil.domain.models.Reservation;
import br.com.menufacil.dto.CreateReservationRequest;
import br.com.menufacil.dto.ReservationResponse;
import br.com.menufacil.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final ReservationConverter reservationConverter;

    private static final Set<String> VALID_STATUSES = Set.of(
            "pending", "confirmed", "cancelled", "completed", "no_show"
    );

    public List<ReservationResponse> findAllByTenant(UUID tenantId) {
        return reservationRepository.findByTenantIdOrderByDateDescTimeStartDesc(tenantId).stream()
                .map(reservationConverter::toResponse)
                .toList();
    }

    public ReservationResponse findById(UUID id, UUID tenantId) {
        Reservation entity = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Reserva não encontrada"));
        validateTenant(entity, tenantId);
        return reservationConverter.toResponse(entity);
    }

    @Transactional
    public ReservationResponse create(UUID tenantId, CreateReservationRequest request) {
        Reservation entity = reservationConverter.toEntity(request);
        entity.setTenantId(tenantId);
        entity.setStatus("pending");
        entity = reservationRepository.save(entity);
        log.info("Reserva criada: {} no tenant {}", entity.getId(), tenantId);
        return reservationConverter.toResponse(entity);
    }

    @Transactional
    public ReservationResponse update(UUID id, UUID tenantId, CreateReservationRequest request) {
        Reservation entity = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Reserva não encontrada"));
        validateTenant(entity, tenantId);
        reservationConverter.updateFromRequest(request, entity);
        entity = reservationRepository.save(entity);
        log.info("Reserva atualizada: {} no tenant {}", entity.getId(), tenantId);
        return reservationConverter.toResponse(entity);
    }

    @Transactional
    public ReservationResponse updateStatus(UUID id, UUID tenantId, String status) {
        if (!VALID_STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Status inválido. Valores aceitos: " + VALID_STATUSES);
        }

        Reservation entity = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Reserva não encontrada"));
        validateTenant(entity, tenantId);
        entity.setStatus(status);
        entity = reservationRepository.save(entity);
        log.info("Status da reserva {} atualizado para {} no tenant {}", id, status, tenantId);
        return reservationConverter.toResponse(entity);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Reservation entity = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Reserva não encontrada"));
        validateTenant(entity, tenantId);
        reservationRepository.delete(entity);
        log.info("Reserva removida: {} no tenant {}", id, tenantId);
    }

    private void validateTenant(Reservation entity, UUID tenantId) {
        if (!entity.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
