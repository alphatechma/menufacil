package br.com.menufacil.repository;

import br.com.menufacil.domain.models.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, UUID> {
    List<Reservation> findByTenantIdOrderByDateDescTimeStartDesc(UUID tenantId);
    List<Reservation> findByTenantIdAndDate(UUID tenantId, LocalDate date);
    List<Reservation> findByTenantIdAndStatus(UUID tenantId, String status);
}
