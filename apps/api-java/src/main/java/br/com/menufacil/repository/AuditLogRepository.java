package br.com.menufacil.repository;

import br.com.menufacil.domain.models.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    @Query("SELECT a FROM AuditLog a WHERE " +
            "(:action IS NULL OR a.action = :action) AND " +
            "(:entityType IS NULL OR a.entityType = :entityType) AND " +
            "(:userId IS NULL OR a.userId = :userId) AND " +
            "(:userEmail IS NULL OR LOWER(a.userEmail) LIKE LOWER(CONCAT('%', :userEmail, '%'))) AND " +
            "(:from IS NULL OR a.createdAt >= :from) AND " +
            "(:to IS NULL OR a.createdAt <= :to)")
    Page<AuditLog> findWithFilters(
            @Param("action") String action,
            @Param("entityType") String entityType,
            @Param("userId") UUID userId,
            @Param("userEmail") String userEmail,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable);

    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.createdAt >= :from")
    long countSince(@Param("from") LocalDateTime from);

    @Query("SELECT a.action AS action, COUNT(a) AS total FROM AuditLog a " +
            "WHERE a.createdAt >= :from GROUP BY a.action ORDER BY COUNT(a) DESC")
    List<Object[]> countByActionSince(@Param("from") LocalDateTime from);

    @Query("SELECT a.entityType AS entityType, COUNT(a) AS total FROM AuditLog a " +
            "WHERE a.createdAt >= :from GROUP BY a.entityType ORDER BY COUNT(a) DESC")
    List<Object[]> countByEntityTypeSince(@Param("from") LocalDateTime from);

    @Query(value = "SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS day, COUNT(*) AS total " +
            "FROM audit_logs WHERE created_at >= :from " +
            "GROUP BY day ORDER BY day ASC", nativeQuery = true)
    List<Object[]> countByDaySince(@Param("from") LocalDateTime from);
}
