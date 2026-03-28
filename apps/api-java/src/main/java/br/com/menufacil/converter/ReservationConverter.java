package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Reservation;
import br.com.menufacil.dto.CreateReservationRequest;
import br.com.menufacil.dto.ReservationResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ReservationConverter {

    @Mapping(target = "id", expression = "java(entity.getId().toString())")
    @Mapping(target = "date", expression = "java(entity.getDate() != null ? entity.getDate().toString() : null)")
    @Mapping(target = "tableId", expression = "java(entity.getTableId() != null ? entity.getTableId().toString() : null)")
    @Mapping(target = "createdAt", expression = "java(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)")
    ReservationResponse toResponse(Reservation entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "date", expression = "java(java.time.LocalDate.parse(request.getDate()))")
    @Mapping(target = "tableId", expression = "java(request.getTableId() != null ? java.util.UUID.fromString(request.getTableId()) : null)")
    Reservation toEntity(CreateReservationRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "date", expression = "java(java.time.LocalDate.parse(request.getDate()))")
    @Mapping(target = "tableId", expression = "java(request.getTableId() != null ? java.util.UUID.fromString(request.getTableId()) : null)")
    void updateFromRequest(CreateReservationRequest request, @MappingTarget Reservation entity);
}
