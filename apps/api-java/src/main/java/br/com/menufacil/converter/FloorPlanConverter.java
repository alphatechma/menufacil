package br.com.menufacil.converter;

import br.com.menufacil.domain.models.FloorPlan;
import br.com.menufacil.dto.CreateFloorPlanRequest;
import br.com.menufacil.dto.FloorPlanResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface FloorPlanConverter {

    @Mapping(target = "id", expression = "java(floorPlan.getId() != null ? floorPlan.getId().toString() : null)")
    @Mapping(target = "unitId", expression = "java(floorPlan.getUnitId() != null ? floorPlan.getUnitId().toString() : null)")
    FloorPlanResponse toResponse(FloorPlan floorPlan);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    FloorPlan toEntity(CreateFloorPlanRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateFromRequest(CreateFloorPlanRequest request, @MappingTarget FloorPlan floorPlan);
}
