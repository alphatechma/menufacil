package br.com.menufacil.converter;

import br.com.menufacil.domain.models.RestaurantTable;
import br.com.menufacil.dto.CreateRestaurantTableRequest;
import br.com.menufacil.dto.RestaurantTableResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface RestaurantTableConverter {

    @Mapping(target = "id", expression = "java(entity.getId().toString())")
    @Mapping(target = "createdAt", expression = "java(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)")
    RestaurantTableResponse toResponse(RestaurantTable entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    RestaurantTable toEntity(CreateRestaurantTableRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    void updateFromRequest(CreateRestaurantTableRequest request, @MappingTarget RestaurantTable entity);
}
