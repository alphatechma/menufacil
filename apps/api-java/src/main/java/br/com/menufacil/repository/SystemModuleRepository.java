package br.com.menufacil.repository;

import br.com.menufacil.domain.models.SystemModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SystemModuleRepository extends JpaRepository<SystemModule, UUID> {
    Optional<SystemModule> findByKey(String key);
    boolean existsByKey(String key);
    List<SystemModule> findAllByOrderByNameAsc();
}
