package br.com.menufacil.repository;

import br.com.menufacil.domain.models.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, UUID> {

    boolean existsByKey(String key);

    Optional<Permission> findByKey(String key);

    List<Permission> findAllByOrderByKeyAsc();

    List<Permission> findByModuleIdOrderByKeyAsc(UUID moduleId);
}
