package br.com.menufacil.converter;

import br.com.menufacil.domain.models.WhatsappInstance;
import br.com.menufacil.dto.WhatsappInstanceResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface WhatsappInstanceConverter {

    @Mapping(target = "id", expression = "java(instance.getId() != null ? instance.getId().toString() : null)")
    @Mapping(target = "unitId", expression = "java(instance.getUnitId() != null ? instance.getUnitId().toString() : null)")
    WhatsappInstanceResponse toResponse(WhatsappInstance instance);
}
