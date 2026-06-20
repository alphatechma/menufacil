package br.com.menufacil.converter;

import br.com.menufacil.domain.models.SystemModule;
import br.com.menufacil.dto.CreateSystemModuleRequest;
import br.com.menufacil.dto.SystemModuleResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface SystemModuleConverter {

    @Mapping(target = "id", expression = "java(systemModule.getId() != null ? systemModule.getId().toString() : null)")
    SystemModuleResponse toResponse(SystemModule systemModule);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    SystemModule toEntity(CreateSystemModuleRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateFromRequest(CreateSystemModuleRequest request, @MappingTarget SystemModule systemModule);
}
