package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Tenant;
import br.com.menufacil.dto.TenantPublicResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TenantConverter {

    @Mapping(target = "id", expression = "java(tenant.getId().toString())")
    TenantPublicResponse toPublicResponse(Tenant tenant);
}
