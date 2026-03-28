package br.com.menufacil.repository;

import br.com.menufacil.domain.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailAndTenantId(String email, UUID tenantId);
    Optional<User> findByEmail(String email);
    List<User> findByTenantId(UUID tenantId);
    long countByTenantId(UUID tenantId);
    boolean existsByEmail(String email);
}
