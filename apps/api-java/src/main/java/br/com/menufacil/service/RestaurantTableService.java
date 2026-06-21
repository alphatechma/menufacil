package br.com.menufacil.service;

import br.com.menufacil.converter.RestaurantTableConverter;
import br.com.menufacil.converter.TableSessionConverter;
import br.com.menufacil.domain.models.RestaurantTable;
import br.com.menufacil.domain.models.TableSession;
import br.com.menufacil.dto.CreateRestaurantTableRequest;
import br.com.menufacil.dto.RestaurantTableResponse;
import br.com.menufacil.dto.TableSessionResponse;
import br.com.menufacil.repository.RestaurantTableRepository;
import br.com.menufacil.repository.TableSessionRepository;
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

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RestaurantTableService {

    private final RestaurantTableRepository tableRepository;
    private final TableSessionRepository sessionRepository;
    private final RestaurantTableConverter tableConverter;
    private final TableSessionConverter sessionConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ---- Tables ----

    public List<RestaurantTableResponse> findAllByTenant(UUID tenantId) {
        return tableRepository.findByTenantIdOrderBySortOrderAsc(tenantId).stream()
                .map(tableConverter::toResponse)
                .toList();
    }

    public RestaurantTableResponse findById(UUID id, UUID tenantId) {
        RestaurantTable entity = tableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Mesa não encontrada"));
        validateTenant(entity, tenantId);
        return tableConverter.toResponse(entity);
    }

    @Transactional
    public RestaurantTableResponse create(UUID tenantId, CreateRestaurantTableRequest request) {
        tableRepository.findByNumberAndTenantId(request.getNumber(), tenantId)
                .ifPresent(t -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Já existe uma mesa com este número");
                });

        RestaurantTable entity = tableConverter.toEntity(request);
        entity.setTenantId(tenantId);
        if (entity.getStatus() == null) {
            entity.setStatus("available");
        }
        entity = tableRepository.save(entity);
        log.info("Mesa criada: {} no tenant {}", entity.getNumber(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("number", entity.getNumber());
            details.put("status", entity.getStatus());
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "restaurant_table",
                    entity.getId(),
                    String.valueOf(entity.getNumber()),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de restaurant_table create: {}", e.getMessage());
        }

        return tableConverter.toResponse(entity);
    }

    @Transactional
    public RestaurantTableResponse update(UUID id, UUID tenantId, CreateRestaurantTableRequest request) {
        RestaurantTable entity = tableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Mesa não encontrada"));
        validateTenant(entity, tenantId);

        int oldNumber = entity.getNumber();
        String oldStatus = entity.getStatus();

        tableConverter.updateFromRequest(request, entity);
        entity = tableRepository.save(entity);
        log.info("Mesa atualizada: {} no tenant {}", entity.getNumber(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldNumber", oldNumber);
            details.put("newNumber", entity.getNumber());
            details.put("oldStatus", oldStatus);
            details.put("newStatus", entity.getStatus());
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "restaurant_table",
                    entity.getId(),
                    String.valueOf(entity.getNumber()),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de restaurant_table update: {}", e.getMessage());
        }

        return tableConverter.toResponse(entity);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        RestaurantTable entity = tableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Mesa não encontrada"));
        validateTenant(entity, tenantId);

        UUID entityId = entity.getId();
        UUID entityTenantId = entity.getTenantId();
        String entityName = String.valueOf(entity.getNumber());

        tableRepository.delete(entity);
        log.info("Mesa removida: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    entityTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "restaurant_table",
                    entityId,
                    entityName,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de restaurant_table delete: {}", e.getMessage());
        }
    }

    // ---- Sessions ----

    public List<TableSessionResponse> findSessionsByTable(UUID tableId, UUID tenantId) {
        return sessionRepository.findByTableIdAndTenantId(tableId, tenantId).stream()
                .map(sessionConverter::toResponse)
                .toList();
    }

    @Transactional
    public TableSessionResponse openSession(UUID tableId, UUID tenantId) {
        tableRepository.findById(tableId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Mesa não encontrada"));

        sessionRepository.findByTableIdAndTenantIdAndStatus(tableId, tenantId, "open")
                .ifPresent(s -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Já existe uma sessão aberta para esta mesa");
                });

        TableSession session = new TableSession();
        session.setTableId(tableId);
        session.setTenantId(tenantId);
        session.setStatus("open");
        session.setOpenedAt(LocalDateTime.now());
        session = sessionRepository.save(session);

        // Atualizar status da mesa para occupied
        RestaurantTable table = tableRepository.findById(tableId).orElseThrow();
        table.setStatus("occupied");
        tableRepository.save(table);

        log.info("Sessão aberta para mesa {} no tenant {}", tableId, tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("tableId", tableId.toString());
            details.put("tableNumber", table.getNumber());
            details.put("openedAt", session.getOpenedAt() != null ? session.getOpenedAt().toString() : null);
            auditLogService.log(
                    session.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "open",
                    "table_session",
                    session.getId(),
                    String.valueOf(table.getNumber()),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de table_session open: {}", e.getMessage());
        }

        return sessionConverter.toResponse(session);
    }

    @Transactional
    public TableSessionResponse closeSession(UUID sessionId, UUID tenantId) {
        TableSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Sessão não encontrada"));

        if (!session.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }

        if ("closed".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sessão já está fechada");
        }

        session.setStatus("closed");
        session.setClosedAt(LocalDateTime.now());
        session = sessionRepository.save(session);

        // Atualizar status da mesa para available
        RestaurantTable table = tableRepository.findById(session.getTableId()).orElseThrow();
        table.setStatus("available");
        tableRepository.save(table);

        log.info("Sessão fechada para mesa {} no tenant {}", session.getTableId(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("tableId", session.getTableId() != null ? session.getTableId().toString() : null);
            details.put("tableNumber", table.getNumber());
            details.put("openedAt", session.getOpenedAt() != null ? session.getOpenedAt().toString() : null);
            details.put("closedAt", session.getClosedAt() != null ? session.getClosedAt().toString() : null);
            auditLogService.log(
                    session.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "close",
                    "table_session",
                    session.getId(),
                    String.valueOf(table.getNumber()),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de table_session close: {}", e.getMessage());
        }

        return sessionConverter.toResponse(session);
    }

    private void validateTenant(RestaurantTable entity, UUID tenantId) {
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
