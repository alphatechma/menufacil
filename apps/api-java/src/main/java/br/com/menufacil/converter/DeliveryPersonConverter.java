package br.com.menufacil.converter;

import br.com.menufacil.domain.models.DeliveryPerson;
import br.com.menufacil.dto.CreateDeliveryPersonRequest;
import br.com.menufacil.dto.DeliveryPersonResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface DeliveryPersonConverter {

    @Mapping(target = "id", expression = "java(entity.getId().toString())")
    @Mapping(target = "createdAt", expression = "java(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)")
    DeliveryPersonResponse toResponse(DeliveryPerson entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "active", source = "isActive")
    DeliveryPerson toEntity(CreateDeliveryPersonRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "active", source = "isActive")
    void updateFromRequest(CreateDeliveryPersonRequest request, @MappingTarget DeliveryPerson entity);
}
