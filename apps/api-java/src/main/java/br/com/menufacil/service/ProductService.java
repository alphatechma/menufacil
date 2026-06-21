package br.com.menufacil.service;

import br.com.menufacil.converter.ProductConverter;
import br.com.menufacil.domain.models.Product;
import br.com.menufacil.dto.CreateProductRequest;
import br.com.menufacil.dto.ProductResponse;
import br.com.menufacil.repository.ProductRepository;
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

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductConverter productConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("price", product.getBasePrice() != null ? product.getBasePrice().toPlainString() : null);
            details.put("categoryId", product.getCategoryId() != null ? product.getCategoryId().toString() : null);
            details.put("active", product.isActive());
            auditLogService.log(
                    product.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "product",
                    product.getId(),
                    product.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de criação de produto: {}", e.getMessage());
        }

        return productConverter.toResponse(product);
    }

    @Transactional
    public ProductResponse update(UUID id, UUID tenantId, CreateProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Produto não encontrado"));

        validateTenant(product, tenantId);

        BigDecimal oldPrice = product.getBasePrice();
        boolean oldActive = product.isActive();

        productConverter.updateFromRequest(request, product);

        product = productRepository.save(product);
        log.info("Produto atualizado: {} no tenant {}", product.getName(), tenantId);

        try {
            boolean priceChanged = oldPrice == null
                    ? product.getBasePrice() != null
                    : product.getBasePrice() == null || oldPrice.compareTo(product.getBasePrice()) != 0;
            Map<String, Object> details = new HashMap<>();
            details.put("priceChanged", priceChanged);
            details.put("active", product.isActive());
            if (oldActive != product.isActive()) {
                details.put("activeChanged", true);
            }
            auditLogService.log(
                    product.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "product",
                    product.getId(),
                    product.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de atualização de produto: {}", e.getMessage());
        }

        return productConverter.toResponse(product);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Produto não encontrado"));

        validateTenant(product, tenantId);

        UUID productId = product.getId();
        String productName = product.getName();
        UUID productTenantId = product.getTenantId();

        productRepository.delete(product);
        log.info("Produto removido: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    productTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "product",
                    productId,
                    productName,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de remoção de produto: {}", e.getMessage());
        }
    }

    private void validateTenant(Product product, UUID tenantId) {
        if (!product.getTenantId().equals(tenantId)) {
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
