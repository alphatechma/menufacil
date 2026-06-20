package br.com.menufacil.repository;

import br.com.menufacil.domain.models.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoleRepository extends JpaRepository<Role, UUID> {

    List<Role> findByTenantIdOrderByNameAsc(UUID tenantId);

    Optional<Role> findByIdAndTenantId(UUID id, UUID tenantId);
}
