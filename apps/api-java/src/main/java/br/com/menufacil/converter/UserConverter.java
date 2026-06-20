package br.com.menufacil.converter;

import br.com.menufacil.domain.models.User;
import br.com.menufacil.dto.CreateUserRequest;
import br.com.menufacil.dto.UpdateUserRequest;
import br.com.menufacil.dto.UserResponse;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface UserConverter {

    @Mapping(target = "id", expression = "java(user.getId() != null ? user.getId().toString() : null)")
    @Mapping(target = "roleId", expression = "java(user.getRoleId() != null ? user.getRoleId().toString() : null)")
    @Mapping(target = "roleName", expression = "java(user.getRole() != null ? user.getRole().getName() : null)")
    @Mapping(target = "unitId", expression = "java(user.getUnitId() != null ? user.getUnitId().toString() : null)")
    @Mapping(target = "unitName", expression = "java(user.getUnit() != null ? user.getUnit().getName() : null)")
    UserResponse toResponse(User user);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "unit", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "phone", ignore = true)
    @Mapping(target = "avatarUrl", ignore = true)
    User toEntity(CreateUserRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "email", ignore = true)
    @Mapping(target = "role", ignore = true)
    @Mapping(target = "unit", ignore = true)
    @Mapping(target = "active", source = "isActive")
    @Mapping(target = "phone", ignore = true)
    @Mapping(target = "avatarUrl", ignore = true)
    void updateFromRequest(UpdateUserRequest request, @MappingTarget User user);
}
