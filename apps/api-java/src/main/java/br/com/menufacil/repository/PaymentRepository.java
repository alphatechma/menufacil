package br.com.menufacil.repository;

import br.com.menufacil.domain.enums.PaymentStatus;
import br.com.menufacil.domain.models.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<PaymentTransaction, UUID> {

    List<PaymentTransaction> findByOrderId(UUID orderId);

    List<PaymentTransaction> findByTenantIdAndStatus(UUID tenantId, PaymentStatus status);

    Optional<PaymentTransaction> findByExternalId(String externalId);
}
