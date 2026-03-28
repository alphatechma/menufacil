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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
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
        return tableConverter.toResponse(entity);
    }

    @Transactional
    public RestaurantTableResponse update(UUID id, UUID tenantId, CreateRestaurantTableRequest request) {
        RestaurantTable entity = tableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Mesa não encontrada"));
        validateTenant(entity, tenantId);
        tableConverter.updateFromRequest(request, entity);
        entity = tableRepository.save(entity);
        log.info("Mesa atualizada: {} no tenant {}", entity.getNumber(), tenantId);
        return tableConverter.toResponse(entity);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        RestaurantTable entity = tableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Mesa não encontrada"));
        validateTenant(entity, tenantId);
        tableRepository.delete(entity);
        log.info("Mesa removida: {} no tenant {}", id, tenantId);
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
        return sessionConverter.toResponse(session);
    }

    private void validateTenant(RestaurantTable entity, UUID tenantId) {
        if (!entity.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
