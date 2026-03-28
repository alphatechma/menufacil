package br.com.menufacil.repository;

import br.com.menufacil.domain.models.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, UUID> {
    Optional<Customer> findByPhoneAndTenantId(String phone, UUID tenantId);
    Optional<Customer> findByEmailAndTenantId(String email, UUID tenantId);
    List<Customer> findByTenantId(UUID tenantId);
}
