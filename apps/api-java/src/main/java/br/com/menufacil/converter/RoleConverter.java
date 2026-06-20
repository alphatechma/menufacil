package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Role;
import br.com.menufacil.dto.CreateRoleRequest;
import br.com.menufacil.dto.RoleResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring", uses = {PermissionConverter.class})
public interface RoleConverter {

    @Mapping(target = "id", expression = "java(role.getId() != null ? role.getId().toString() : null)")
    @Mapping(target = "permissions", source = "permissions")
    RoleResponse toResponse(Role role);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "permissions", ignore = true)
    @Mapping(target = "systemDefault", ignore = true)
    Role toEntity(CreateRoleRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "permissions", ignore = true)
    @Mapping(target = "systemDefault", ignore = true)
    void updateFromRequest(CreateRoleRequest request, @MappingTarget Role role);
}
