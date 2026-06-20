package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.dto.CreatePermissionRequest;
import br.com.menufacil.dto.PermissionResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface PermissionConverter {

    @Mapping(target = "id", expression = "java(permission.getId() != null ? permission.getId().toString() : null)")
    @Mapping(target = "moduleId", expression = "java(permission.getModule() != null && permission.getModule().getId() != null ? permission.getModule().getId().toString() : null)")
    @Mapping(target = "moduleKey", expression = "java(permission.getModule() != null ? permission.getModule().getKey() : null)")
    @Mapping(target = "moduleName", expression = "java(permission.getModule() != null ? permission.getModule().getName() : null)")
    PermissionResponse toResponse(Permission permission);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "module", ignore = true)
    Permission toEntity(CreatePermissionRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "module", ignore = true)
    void updateFromRequest(CreatePermissionRequest request, @MappingTarget Permission permission);
}
