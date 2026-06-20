package br.com.menufacil.converter;

import br.com.menufacil.domain.models.AbandonedCart;
import br.com.menufacil.dto.AbandonedCartResponse;
import br.com.menufacil.dto.SaveAbandonedCartRequest;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface AbandonedCartConverter {

    @Mapping(target = "id", expression = "java(cart.getId().toString())")
    @Mapping(target = "customerId", expression = "java(cart.getCustomerId() != null ? cart.getCustomerId().toString() : null)")
    AbandonedCartResponse toResponse(AbandonedCart cart);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "recovered", ignore = true)
    @Mapping(target = "recoveredAt", ignore = true)
    @Mapping(target = "notificationSent", ignore = true)
    AbandonedCart toEntity(SaveAbandonedCartRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "recovered", ignore = true)
    @Mapping(target = "recoveredAt", ignore = true)
    @Mapping(target = "notificationSent", ignore = true)
    void updateFromRequest(SaveAbandonedCartRequest request, @MappingTarget AbandonedCart cart);
}
