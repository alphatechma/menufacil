package br.com.menufacil.service;

import br.com.menufacil.converter.AuditLogConverter;
import br.com.menufacil.domain.models.AuditLog;
import br.com.menufacil.dto.AuditLogResponse;
import br.com.menufacil.dto.AuditLogStatsResponse;
import br.com.menufacil.dto.CreateAuditLogRequest;
import br.com.menufacil.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Serviço de auditoria do sistema.
 * Permite registrar ações (chamado internamente por outros serviços)
 * e consultar logs/estatísticas via endpoints admin.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final AuditLogConverter auditLogConverter;

    /**
     * Lista logs de auditoria com filtros opcionais e paginação.
     * Filtros nulos são ignorados na query.
     */
    public Page<AuditLogResponse> findAll(
            String action,
            String entityType,
            UUID userId,
            String userEmail,
            LocalDateTime from,
            LocalDateTime to,
            int page,
            int limit) {

        Pageable pageable = PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLog> result = auditLogRepository.findWithFilters(
                action, entityType, userId, userEmail, from, to, pageable);

        return result.map(auditLogConverter::toResponse);
    }

    /**
     * Retorna estatísticas dos últimos 30 dias:
     * - totalLogs
     * - byAction (Map<action, count>)
     * - byEntityType (Map<entityType, count>)
     * - byDay (List<{date, count}>)
     */
    public AuditLogStatsResponse getStats() {
        LocalDateTime from = LocalDateTime.now().minusDays(30);

        long totalLogs = auditLogRepository.countSince(from);

        Map<String, Long> byAction = toCountMap(auditLogRepository.countByActionSince(from));
        Map<String, Long> byEntityType = toCountMap(auditLogRepository.countByEntityTypeSince(from));

        List<AuditLogStatsResponse.DailyCount> byDay = auditLogRepository.countByDaySince(from).stream()
                .map(row -> AuditLogStatsResponse.DailyCount.builder()
                        .date(String.valueOf(row[0]))
                        .count(((Number) row[1]).longValue())
                        .build())
                .toList();

        return AuditLogStatsResponse.builder()
                .totalLogs(totalLogs)
                .byAction(byAction)
                .byEntityType(byEntityType)
                .byDay(byDay)
                .build();
    }

    /**
     * Registra uma nova entrada de auditoria.
     * Método público para uso interno de outros serviços.
     * tenantId é opcional (ações de super admin podem ter tenant nulo).
     */
    @Transactional
    public AuditLogResponse log(UUID tenantId, CreateAuditLogRequest request) {
        AuditLog auditLog = auditLogConverter.toEntity(request);
        auditLog.setTenantId(tenantId);

        auditLog = auditLogRepository.save(auditLog);
        log.info("Auditoria registrada: action={} entityType={} userEmail={} tenantId={}",
                auditLog.getAction(), auditLog.getEntityType(), auditLog.getUserEmail(), tenantId);
        return auditLogConverter.toResponse(auditLog);
    }

    /**
     * Versão simplificada para chamadas internas sem DTO.
     */
    @Transactional
    public AuditLog log(UUID tenantId,
                        UUID userId,
                        String userEmail,
                        String action,
                        String entityType,
                        UUID entityId,
                        String entityName,
                        String details,
                        String ipAddress) {
        AuditLog auditLog = new AuditLog();
        auditLog.setTenantId(tenantId);
        auditLog.setUserId(userId);
        auditLog.setUserEmail(userEmail);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setEntityName(entityName);
        auditLog.setDetails(details);
        auditLog.setIpAddress(ipAddress);

        auditLog = auditLogRepository.save(auditLog);
        log.info("Auditoria registrada: action={} entityType={} userEmail={} tenantId={}",
                action, entityType, userEmail, tenantId);
        return auditLog;
    }

    private Map<String, Long> toCountMap(List<Object[]> rows) {
        Map<String, Long> map = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String key = row[0] != null ? row[0].toString() : "unknown";
            long count = ((Number) row[1]).longValue();
            map.put(key, count);
        }
        return map;
    }
}
