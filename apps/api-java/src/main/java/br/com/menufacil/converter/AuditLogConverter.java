package br.com.menufacil.converter;

import br.com.menufacil.domain.models.AuditLog;
import br.com.menufacil.dto.AuditLogResponse;
import br.com.menufacil.dto.CreateAuditLogRequest;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface AuditLogConverter {

    @Mapping(target = "id", expression = "java(auditLog.getId() != null ? auditLog.getId().toString() : null)")
    @Mapping(target = "tenantId", expression = "java(auditLog.getTenantId() != null ? auditLog.getTenantId().toString() : null)")
    @Mapping(target = "userId", expression = "java(auditLog.getUserId() != null ? auditLog.getUserId().toString() : null)")
    @Mapping(target = "entityId", expression = "java(auditLog.getEntityId() != null ? auditLog.getEntityId().toString() : null)")
    AuditLogResponse toResponse(AuditLog auditLog);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    AuditLog toEntity(CreateAuditLogRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateFromRequest(CreateAuditLogRequest request, @MappingTarget AuditLog auditLog);
}
