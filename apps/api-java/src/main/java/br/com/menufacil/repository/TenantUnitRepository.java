package br.com.menufacil.repository;

import br.com.menufacil.domain.models.TenantUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantUnitRepository extends JpaRepository<TenantUnit, UUID> {

    List<TenantUnit> findByTenantIdOrderByIsHeadquartersDescNameAsc(UUID tenantId);

    List<TenantUnit> findByTenantIdAndIsActiveTrueOrderByIsHeadquartersDescNameAsc(UUID tenantId);

    Optional<TenantUnit> findByTenantIdAndSlug(UUID tenantId, String slug);

    long countByTenantId(UUID tenantId);
}
