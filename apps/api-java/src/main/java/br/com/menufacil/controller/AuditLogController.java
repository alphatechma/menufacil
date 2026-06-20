package br.com.menufacil.controller;

import br.com.menufacil.config.security.RequirePermissions;
import br.com.menufacil.dto.AuditLogResponse;
import br.com.menufacil.dto.AuditLogStatsResponse;
import br.com.menufacil.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.UUID;

@Tag(name = "Super Admin - Audit Logs", description = "Consulta de logs de auditoria do sistema")
@RestController
@RequestMapping("/super-admin/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @Operation(summary = "Listar logs de auditoria com filtros e paginação")
    @RequirePermissions("report:read")
    @GetMapping
    public ResponseEntity<Page<AuditLogResponse>> findAll(
            @RequestParam(required = false) String action,
            @RequestParam(name = "entityType", required = false) String entityType,
            @RequestParam(name = "userId", required = false) UUID userId,
            @RequestParam(name = "userEmail", required = false) String userEmail,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int limit) {

        return ResponseEntity.ok(
                auditLogService.findAll(action, entityType, userId, userEmail, from, to, page, limit));
    }

    @Operation(summary = "Estatísticas agregadas dos logs de auditoria (últimos 30 dias)")
    @RequirePermissions("report:read")
    @GetMapping("/stats")
    public ResponseEntity<AuditLogStatsResponse> getStats() {
        return ResponseEntity.ok(auditLogService.getStats());
    }
}
