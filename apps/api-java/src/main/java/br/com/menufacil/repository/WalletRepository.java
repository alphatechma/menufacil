package br.com.menufacil.repository;

import br.com.menufacil.domain.models.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, UUID> {
    Optional<Wallet> findByCustomerIdAndTenantId(UUID customerId, UUID tenantId);
}
