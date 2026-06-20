package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AuditLogResponse {
    private String id;
    private String tenantId;
    private String userId;
    private String userEmail;
    private String action;
    private String entityType;
    private String entityId;
    private String entityName;
    private String details;
    private String ipAddress;
    private LocalDateTime createdAt;
}
