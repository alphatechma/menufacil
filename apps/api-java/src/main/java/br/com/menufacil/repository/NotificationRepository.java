package br.com.menufacil.repository;

import br.com.menufacil.domain.enums.NotificationStatus;
import br.com.menufacil.domain.models.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByTenantId(UUID tenantId);
    List<Notification> findByOrderId(UUID orderId);
    List<Notification> findByStatus(NotificationStatus status);

    /**
     * Usado pelo NotificationWorker para buscar a próxima janela de notificações
     * pendentes (FIFO por createdAt). Limita a 50 por execução pra evitar long batches.
     */
    List<Notification> findTop50ByStatusOrderByCreatedAtAsc(NotificationStatus status);

    /**
     * Remove notificações em status finais ({@code sent} ou {@code failed}) cujo
     * {@code createdAt} é anterior ao cutoff. Usado pelo {@code CleanupWorker}
     * para conter o crescimento indefinido da tabela.
     *
     * @return quantidade de registros removidos
     */
    @Modifying
    @Query("delete from Notification n where n.status in :statuses and n.createdAt < :cutoff")
    int deleteByStatusInAndCreatedAtBefore(@Param("statuses") Collection<NotificationStatus> statuses,
                                           @Param("cutoff") LocalDateTime cutoff);
}
