package br.com.menufacil.converter;

import br.com.menufacil.domain.models.WhatsappMessage;
import br.com.menufacil.dto.WhatsappMessageResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface WhatsappMessageConverter {

    @Mapping(target = "id", expression = "java(message.getId() != null ? message.getId().toString() : null)")
    @Mapping(target = "instanceId", expression = "java(message.getInstanceId() != null ? message.getInstanceId().toString() : null)")
    WhatsappMessageResponse toResponse(WhatsappMessage message);
}
