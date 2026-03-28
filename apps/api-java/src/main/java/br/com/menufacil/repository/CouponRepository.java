package br.com.menufacil.repository;

import br.com.menufacil.domain.models.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CouponRepository extends JpaRepository<Coupon, UUID> {
    List<Coupon> findByTenantId(UUID tenantId);
    List<Coupon> findByTenantIdAndIsActiveTrue(UUID tenantId);
    Optional<Coupon> findByCodeAndTenantId(String code, UUID tenantId);
}
