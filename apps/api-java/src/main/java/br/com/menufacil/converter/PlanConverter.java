package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Plan;
import br.com.menufacil.dto.CreatePlanRequest;
import br.com.menufacil.dto.PlanResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring", uses = {SystemModuleConverter.class})
public interface PlanConverter {

    @Mapping(target = "id", expression = "java(plan.getId() != null ? plan.getId().toString() : null)")
    @Mapping(target = "modules", source = "modules")
    PlanResponse toResponse(Plan plan);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "modules", ignore = true)
    @Mapping(target = "active", source = "isActive")
    Plan toEntity(CreatePlanRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "modules", ignore = true)
    @Mapping(target = "active", source = "isActive")
    void updateFromRequest(CreatePlanRequest request, @MappingTarget Plan plan);
}
