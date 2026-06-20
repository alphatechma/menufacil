package br.com.menufacil.converter;

import br.com.menufacil.domain.models.TenantUnit;
import br.com.menufacil.dto.CreateTenantUnitRequest;
import br.com.menufacil.dto.TenantUnitResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface TenantUnitConverter {

    @Mapping(target = "id", expression = "java(tenantUnit.getId().toString())")
    TenantUnitResponse toResponse(TenantUnit tenantUnit);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "headquarters", ignore = true)
    @Mapping(target = "active", source = "isActive")
    TenantUnit toEntity(CreateTenantUnitRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "headquarters", ignore = true)
    @Mapping(target = "slug", ignore = true)
    @Mapping(target = "active", source = "isActive")
    void updateFromRequest(CreateTenantUnitRequest request, @MappingTarget TenantUnit tenantUnit);
}
