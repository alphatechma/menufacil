package br.com.menufacil.repository;

import br.com.menufacil.domain.models.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findByTenantIdAndIsActiveTrue(UUID tenantId);
    List<Category> findByTenantId(UUID tenantId);
    List<Category> findByTenantIdOrderBySortOrderAsc(UUID tenantId);
}
