package br.com.menufacil.repository;

import br.com.menufacil.domain.models.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    Optional<Tenant> findBySlugAndIsActiveTrue(String slug);
    Optional<Tenant> findBySlug(String slug);
}
