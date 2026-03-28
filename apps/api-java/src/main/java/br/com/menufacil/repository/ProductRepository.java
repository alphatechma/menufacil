package br.com.menufacil.repository;

import br.com.menufacil.domain.models.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findByTenantIdAndIsActiveTrue(UUID tenantId);
    List<Product> findByTenantId(UUID tenantId);
    List<Product> findByCategoryIdAndTenantId(UUID categoryId, UUID tenantId);
}
