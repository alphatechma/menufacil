package br.com.menufacil.converter;

import br.com.menufacil.domain.models.DeliveryZone;
import br.com.menufacil.dto.CreateDeliveryZoneRequest;
import br.com.menufacil.dto.DeliveryZoneResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface DeliveryZoneConverter {

    @Mapping(target = "id", expression = "java(entity.getId().toString())")
    @Mapping(target = "createdAt", expression = "java(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)")
    DeliveryZoneResponse toResponse(DeliveryZone entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    DeliveryZone toEntity(CreateDeliveryZoneRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    void updateFromRequest(CreateDeliveryZoneRequest request, @MappingTarget DeliveryZone entity);
}
