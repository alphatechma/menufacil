package br.com.menufacil.converter;

import br.com.menufacil.domain.models.TableSession;
import br.com.menufacil.dto.TableSessionResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TableSessionConverter {

    @Mapping(target = "id", expression = "java(entity.getId().toString())")
    @Mapping(target = "tableId", expression = "java(entity.getTableId().toString())")
    @Mapping(target = "openedAt", expression = "java(entity.getOpenedAt() != null ? entity.getOpenedAt().toString() : null)")
    @Mapping(target = "closedAt", expression = "java(entity.getClosedAt() != null ? entity.getClosedAt().toString() : null)")
    @Mapping(target = "createdAt", expression = "java(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)")
    TableSessionResponse toResponse(TableSession entity);
}
