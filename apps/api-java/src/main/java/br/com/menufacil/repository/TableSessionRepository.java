package br.com.menufacil.repository;

import br.com.menufacil.domain.models.TableSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TableSessionRepository extends JpaRepository<TableSession, UUID> {
    List<TableSession> findByTableIdAndTenantId(UUID tableId, UUID tenantId);
    Optional<TableSession> findByTableIdAndTenantIdAndStatus(UUID tableId, UUID tenantId, String status);
}
