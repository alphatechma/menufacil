package br.com.menufacil.converter;

import br.com.menufacil.domain.enums.WhatsappFlowTriggerType;
import br.com.menufacil.domain.models.WhatsappFlow;
import br.com.menufacil.dto.CreateWhatsappFlowRequest;
import br.com.menufacil.dto.WhatsappFlowResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface WhatsappFlowConverter {

    @Mapping(target = "id", expression = "java(flow.getId() != null ? flow.getId().toString() : null)")
    @Mapping(target = "triggerType", expression = "java(flow.getTriggerType() != null ? flow.getTriggerType().name() : null)")
    WhatsappFlowResponse toResponse(WhatsappFlow flow);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "triggerType", source = "triggerType", qualifiedByName = "stringToTriggerType")
    WhatsappFlow toEntity(CreateWhatsappFlowRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "triggerType", source = "triggerType", qualifiedByName = "stringToTriggerType")
    void updateFromRequest(CreateWhatsappFlowRequest request, @MappingTarget WhatsappFlow flow);

    @Named("stringToTriggerType")
    default WhatsappFlowTriggerType stringToTriggerType(String value) {
        return value != null ? WhatsappFlowTriggerType.valueOf(value) : null;
    }
}
