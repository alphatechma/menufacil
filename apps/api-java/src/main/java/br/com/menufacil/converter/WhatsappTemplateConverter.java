package br.com.menufacil.converter;

import br.com.menufacil.domain.models.WhatsappMessageTemplate;
import br.com.menufacil.dto.CreateWhatsappTemplateRequest;
import br.com.menufacil.dto.WhatsappTemplateResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface WhatsappTemplateConverter {

    @Mapping(target = "id", expression = "java(template.getId() != null ? template.getId().toString() : null)")
    WhatsappTemplateResponse toResponse(WhatsappMessageTemplate template);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    WhatsappMessageTemplate toEntity(CreateWhatsappTemplateRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateFromRequest(CreateWhatsappTemplateRequest request, @MappingTarget WhatsappMessageTemplate template);
}
