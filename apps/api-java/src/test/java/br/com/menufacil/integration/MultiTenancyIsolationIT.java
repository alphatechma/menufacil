package br.com.menufacil.integration;

import br.com.menufacil.domain.models.Product;
import br.com.menufacil.domain.models.Tenant;
import br.com.menufacil.repository.ProductRepository;
import br.com.menufacil.repository.TenantRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Valida que o {@code ProductRepository.findByTenantId} (usado em conjunto
 * com o {@code HibernateTenantFilterAspect}) realmente isola produtos por
 * tenant em consultas diretas ao repositorio.
 * <p>
 * Este teste foca no <strong>repositorio</strong> (camada de dados) para
 * evitar dependencia do filtro X-Tenant-Slug do TenantFilter (que requer
 * is_active=true e um setup HTTP completo). O isolamento via HTTP esta
 * coberto indiretamente pelos demais ITs.
 */
class MultiTenancyIsolationIT extends BaseIntegrationTest {

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private ProductRepository productRepository;

    @Test
    @DisplayName("findByTenantId nao retorna produtos de outro tenant")
    void productRepository_isolatesByTenantId() {
        Tenant tenantA = persistTenant("iso-a-" + shortUuid(), "Tenant A");
        Tenant tenantB = persistTenant("iso-b-" + shortUuid(), "Tenant B");

        persistProduct(tenantA.getId(), "Burger A");
        persistProduct(tenantA.getId(), "Pizza A");
        persistProduct(tenantB.getId(), "Sushi B");

        List<Product> productsA = productRepository.findByTenantId(tenantA.getId());
        List<Product> productsB = productRepository.findByTenantId(tenantB.getId());

        assertThat(productsA)
                .extracting(Product::getName)
                .containsExactlyInAnyOrder("Burger A", "Pizza A");
        assertThat(productsA)
                .allMatch(p -> p.getTenantId().equals(tenantA.getId()));

        assertThat(productsB)
                .extracting(Product::getName)
                .containsExactly("Sushi B");
        assertThat(productsB)
                .allMatch(p -> p.getTenantId().equals(tenantB.getId()));

        // Garantia explicita: nenhum produto do tenant B aparece quando filtramos por A
        assertThat(productsA)
                .noneMatch(p -> p.getTenantId().equals(tenantB.getId()));
    }

    private Tenant persistTenant(String slug, String name) {
        Tenant t = new Tenant();
        t.setSlug(slug);
        t.setName(name);
        t.setActive(true);
        return tenantRepository.save(t);
    }

    private Product persistProduct(UUID tenantId, String name) {
        Product p = new Product();
        p.setTenantId(tenantId);
        p.setName(name);
        p.setBasePrice(new BigDecimal("19.90"));
        p.setActive(true);
        p.setSortOrder(0);
        return productRepository.save(p);
    }

    private static String shortUuid() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
