package br.com.menufacil.service;

import br.com.menufacil.converter.CategoryConverter;
import br.com.menufacil.domain.models.Category;
import br.com.menufacil.dto.CategoryResponse;
import br.com.menufacil.dto.CreateCategoryRequest;
import br.com.menufacil.repository.CategoryRepository;
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
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryConverter categoryConverter;

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
        return categoryConverter.toResponse(category);
    }

    @Transactional
    public CategoryResponse update(UUID id, UUID tenantId, CreateCategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Categoria não encontrada"));

        validateTenant(category, tenantId);
        categoryConverter.updateFromRequest(request, category);

        category = categoryRepository.save(category);
        log.info("Categoria atualizada: {} no tenant {}", category.getName(), tenantId);
        return categoryConverter.toResponse(category);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Categoria não encontrada"));

        validateTenant(category, tenantId);
        categoryRepository.delete(category);
        log.info("Categoria removida: {} no tenant {}", id, tenantId);
    }

    private void validateTenant(Category category, UUID tenantId) {
        if (!category.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
