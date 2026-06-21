package br.com.menufacil.service;

import br.com.menufacil.converter.ReservationConverter;
import br.com.menufacil.domain.models.Reservation;
import br.com.menufacil.dto.CreateReservationRequest;
import br.com.menufacil.dto.ReservationResponse;
import br.com.menufacil.repository.ReservationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final ReservationConverter reservationConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("customerName", entity.getCustomerName());
            details.put("partySize", entity.getPartySize());
            details.put("date", entity.getDate() != null ? entity.getDate().toString() : null);
            details.put("timeStart", entity.getTimeStart());
            details.put("status", entity.getStatus());
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "reservation",
                    entity.getId(),
                    entity.getCustomerName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de reservation create: {}", e.getMessage());
        }

        return reservationConverter.toResponse(entity);
    }

    @Transactional
    public ReservationResponse update(UUID id, UUID tenantId, CreateReservationRequest request) {
        Reservation entity = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Reserva não encontrada"));
        validateTenant(entity, tenantId);

        String oldCustomerName = entity.getCustomerName();
        int oldPartySize = entity.getPartySize();

        reservationConverter.updateFromRequest(request, entity);
        entity = reservationRepository.save(entity);
        log.info("Reserva atualizada: {} no tenant {}", entity.getId(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldCustomerName", oldCustomerName);
            details.put("newCustomerName", entity.getCustomerName());
            details.put("oldPartySize", oldPartySize);
            details.put("newPartySize", entity.getPartySize());
            details.put("date", entity.getDate() != null ? entity.getDate().toString() : null);
            details.put("timeStart", entity.getTimeStart());
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "reservation",
                    entity.getId(),
                    entity.getCustomerName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de reservation update: {}", e.getMessage());
        }

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

        String oldStatus = entity.getStatus();
        entity.setStatus(status);
        entity = reservationRepository.save(entity);
        log.info("Status da reserva {} atualizado para {} no tenant {}", id, status, tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldStatus", oldStatus);
            details.put("newStatus", entity.getStatus());
            String action = "cancelled".equals(status) ? "cancel" : "update_status";
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    action,
                    "reservation",
                    entity.getId(),
                    entity.getCustomerName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de reservation updateStatus: {}", e.getMessage());
        }

        return reservationConverter.toResponse(entity);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Reservation entity = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Reserva não encontrada"));
        validateTenant(entity, tenantId);

        UUID entityId = entity.getId();
        UUID entityTenantId = entity.getTenantId();
        String entityName = entity.getCustomerName();

        reservationRepository.delete(entity);
        log.info("Reserva removida: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    entityTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "reservation",
                    entityId,
                    entityName,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de reservation delete: {}", e.getMessage());
        }
    }

    private void validateTenant(Reservation entity, UUID tenantId) {
        if (!entity.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        Object details = auth.getDetails();
        if (details instanceof Claims claims) {
            String userId = claims.get("userId", String.class);
            if (userId != null && !userId.isBlank()) {
                try { return UUID.fromString(userId); } catch (IllegalArgumentException ignored) {}
            }
        }
        return null;
    }

    private String getCurrentIpAddress() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes)
                    RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                String forwarded = req.getHeader("X-Forwarded-For");
                if (forwarded != null && !forwarded.isBlank()) {
                    return forwarded.split(",")[0].trim();
                }
                return req.getRemoteAddr();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String serializeDetails(Map<String, Object> details) {
        if (details == null || details.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(details);
        } catch (Exception e) {
            return details.toString();
        }
    }
}
