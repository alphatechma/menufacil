package br.com.menufacil.repository;

import br.com.menufacil.domain.enums.NotificationStatus;
import br.com.menufacil.domain.models.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByTenantId(UUID tenantId);
    List<Notification> findByOrderId(UUID orderId);
    List<Notification> findByStatus(NotificationStatus status);
}
