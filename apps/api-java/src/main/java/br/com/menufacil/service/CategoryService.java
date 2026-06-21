package br.com.menufacil.service;

import br.com.menufacil.converter.CategoryConverter;
import br.com.menufacil.domain.models.Category;
import br.com.menufacil.dto.CategoryResponse;
import br.com.menufacil.dto.CreateCategoryRequest;
import br.com.menufacil.repository.CategoryRepository;
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
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryConverter categoryConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<CategoryResponse> findActiveByTenant(UUID tenantId) {
        return categoryRepository.findByTenantIdAndIsActiveTrue(tenantId).stream()
                .map(categoryConverter::toResponse)
                .toList();
    }

    public List<CategoryResponse> findAllByTenant(UUID tenantId) {
        return categoryRepository.findByTenantIdOrderBySortOrderAsc(tenantId).stream()
                .map(categoryConverter::toResponse)
                .toList();
    }

    @Transactional
    public CategoryResponse create(UUID tenantId, CreateCategoryRequest request) {
        Category category = categoryConverter.toEntity(request);
        category.setTenantId(tenantId);

        category = categoryRepository.save(category);
        log.info("Categoria criada: {} no tenant {}", category.getName(), tenantId);

        try {
            auditLogService.log(
                    category.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "category",
                    category.getId(),
                    category.getName(),
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de criação de categoria: {}", e.getMessage());
        }

        return categoryConverter.toResponse(category);
    }

    @Transactional
    public CategoryResponse update(UUID id, UUID tenantId, CreateCategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Categoria não encontrada"));

        validateTenant(category, tenantId);

        String oldName = category.getName();
        categoryConverter.updateFromRequest(request, category);

        category = categoryRepository.save(category);
        log.info("Categoria atualizada: {} no tenant {}", category.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            if (oldName != null && !oldName.equals(category.getName())) {
                details.put("oldName", oldName);
                details.put("newName", category.getName());
            }
            auditLogService.log(
                    category.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "category",
                    category.getId(),
                    category.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de atualização de categoria: {}", e.getMessage());
        }

        return categoryConverter.toResponse(category);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Categoria não encontrada"));

        validateTenant(category, tenantId);

        UUID categoryId = category.getId();
        String categoryName = category.getName();
        UUID categoryTenantId = category.getTenantId();

        categoryRepository.delete(category);
        log.info("Categoria removida: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    categoryTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "category",
                    categoryId,
                    categoryName,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de remoção de categoria: {}", e.getMessage());
        }
    }

    private void validateTenant(Category category, UUID tenantId) {
        if (!category.getTenantId().equals(tenantId)) {
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
