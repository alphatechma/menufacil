package br.com.menufacil.service;

import br.com.menufacil.converter.ProductConverter;
import br.com.menufacil.domain.models.Product;
import br.com.menufacil.dto.CreateProductRequest;
import br.com.menufacil.dto.ProductResponse;
import br.com.menufacil.repository.ProductRepository;
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
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductConverter productConverter;

    public List<ProductResponse> findActiveByTenant(UUID tenantId) {
        return productRepository.findByTenantIdAndIsActiveTrue(tenantId).stream()
                .map(productConverter::toResponse)
                .toList();
    }

    public List<ProductResponse> findAllByTenant(UUID tenantId) {
        return productRepository.findByTenantId(tenantId).stream()
                .map(productConverter::toResponse)
                .toList();
    }

    public ProductResponse findById(UUID id, UUID tenantId) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Produto não encontrado"));

        validateTenant(product, tenantId);
        return productConverter.toResponse(product);
    }

    @Transactional
    public ProductResponse create(UUID tenantId, CreateProductRequest request) {
        Product product = productConverter.toEntity(request);
        product.setTenantId(tenantId);

        product = productRepository.save(product);
        log.info("Produto criado: {} no tenant {}", product.getName(), tenantId);
        return productConverter.toResponse(product);
    }

    @Transactional
    public ProductResponse update(UUID id, UUID tenantId, CreateProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Produto não encontrado"));

        validateTenant(product, tenantId);
        productConverter.updateFromRequest(request, product);

        product = productRepository.save(product);
        log.info("Produto atualizado: {} no tenant {}", product.getName(), tenantId);
        return productConverter.toResponse(product);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Produto não encontrado"));

        validateTenant(product, tenantId);
        productRepository.delete(product);
        log.info("Produto removido: {} no tenant {}", id, tenantId);
    }

    private void validateTenant(Product product, UUID tenantId) {
        if (!product.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
