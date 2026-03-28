package br.com.menufacil.service;

import br.com.menufacil.converter.DeliveryPersonConverter;
import br.com.menufacil.domain.models.DeliveryPerson;
import br.com.menufacil.dto.CreateDeliveryPersonRequest;
import br.com.menufacil.dto.DeliveryPersonResponse;
import br.com.menufacil.repository.DeliveryPersonRepository;
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
public class DeliveryPersonService {

    private final DeliveryPersonRepository deliveryPersonRepository;
    private final DeliveryPersonConverter deliveryPersonConverter;

    public List<DeliveryPersonResponse> findAllByTenant(UUID tenantId) {
        return deliveryPersonRepository.findByTenantId(tenantId).stream()
                .map(deliveryPersonConverter::toResponse)
                .toList();
    }

    public List<DeliveryPersonResponse> findActiveByTenant(UUID tenantId) {
        return deliveryPersonRepository.findByTenantIdAndIsActiveTrue(tenantId).stream()
                .map(deliveryPersonConverter::toResponse)
                .toList();
    }

    public DeliveryPersonResponse findById(UUID id, UUID tenantId) {
        DeliveryPerson entity = deliveryPersonRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Entregador não encontrado"));
        validateTenant(entity, tenantId);
        return deliveryPersonConverter.toResponse(entity);
    }

    @Transactional
    public DeliveryPersonResponse create(UUID tenantId, CreateDeliveryPersonRequest request) {
        DeliveryPerson entity = deliveryPersonConverter.toEntity(request);
        entity.setTenantId(tenantId);
        entity = deliveryPersonRepository.save(entity);
        log.info("Entregador criado: {} no tenant {}", entity.getName(), tenantId);
        return deliveryPersonConverter.toResponse(entity);
    }

    @Transactional
    public DeliveryPersonResponse update(UUID id, UUID tenantId, CreateDeliveryPersonRequest request) {
        DeliveryPerson entity = deliveryPersonRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Entregador não encontrado"));
        validateTenant(entity, tenantId);
        deliveryPersonConverter.updateFromRequest(request, entity);
        entity = deliveryPersonRepository.save(entity);
        log.info("Entregador atualizado: {} no tenant {}", entity.getName(), tenantId);
        return deliveryPersonConverter.toResponse(entity);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        DeliveryPerson entity = deliveryPersonRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Entregador não encontrado"));
        validateTenant(entity, tenantId);
        deliveryPersonRepository.delete(entity);
        log.info("Entregador removido: {} no tenant {}", id, tenantId);
    }

    private void validateTenant(DeliveryPerson entity, UUID tenantId) {
        if (!entity.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
