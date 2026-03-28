package br.com.menufacil.service;

import br.com.menufacil.converter.DeliveryZoneConverter;
import br.com.menufacil.domain.models.DeliveryZone;
import br.com.menufacil.dto.CreateDeliveryZoneRequest;
import br.com.menufacil.dto.DeliveryZoneResponse;
import br.com.menufacil.repository.DeliveryZoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeliveryZoneService {

    private final DeliveryZoneRepository deliveryZoneRepository;
    private final DeliveryZoneConverter deliveryZoneConverter;

    public List<DeliveryZoneResponse> findAllByTenant(UUID tenantId) {
        return deliveryZoneRepository.findByTenantId(tenantId).stream()
                .map(deliveryZoneConverter::toResponse)
                .toList();
    }

    public DeliveryZoneResponse findById(UUID id, UUID tenantId) {
        DeliveryZone entity = deliveryZoneRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Zona de entrega não encontrada"));
        validateTenant(entity, tenantId);
        return deliveryZoneConverter.toResponse(entity);
    }

    @Transactional
    public DeliveryZoneResponse create(UUID tenantId, CreateDeliveryZoneRequest request) {
        DeliveryZone entity = deliveryZoneConverter.toEntity(request);
        entity.setTenantId(tenantId);
        entity = deliveryZoneRepository.save(entity);
        log.info("Zona de entrega criada: {} no tenant {}", entity.getName(), tenantId);
        return deliveryZoneConverter.toResponse(entity);
    }

    @Transactional
    public DeliveryZoneResponse update(UUID id, UUID tenantId, CreateDeliveryZoneRequest request) {
        DeliveryZone entity = deliveryZoneRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Zona de entrega não encontrada"));
        validateTenant(entity, tenantId);
        deliveryZoneConverter.updateFromRequest(request, entity);
        entity = deliveryZoneRepository.save(entity);
        log.info("Zona de entrega atualizada: {} no tenant {}", entity.getName(), tenantId);
        return deliveryZoneConverter.toResponse(entity);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        DeliveryZone entity = deliveryZoneRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Zona de entrega não encontrada"));
        validateTenant(entity, tenantId);
        deliveryZoneRepository.delete(entity);
        log.info("Zona de entrega removida: {} no tenant {}", id, tenantId);
    }

    private void validateTenant(DeliveryZone entity, UUID tenantId) {
        if (!entity.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
