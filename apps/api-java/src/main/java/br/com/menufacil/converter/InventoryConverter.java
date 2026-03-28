package br.com.menufacil.converter;

import br.com.menufacil.domain.models.InventoryItem;
import br.com.menufacil.domain.models.StockMovement;
import br.com.menufacil.dto.CreateInventoryItemRequest;
import br.com.menufacil.dto.CreateStockMovementRequest;
import br.com.menufacil.dto.InventoryItemResponse;
import br.com.menufacil.dto.StockMovementResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface InventoryConverter {

    @Mapping(target = "id", expression = "java(entity.getId().toString())")
    @Mapping(target = "createdAt", expression = "java(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)")
    InventoryItemResponse toItemResponse(InventoryItem entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    InventoryItem toItemEntity(CreateInventoryItemRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    void updateItemFromRequest(CreateInventoryItemRequest request, @MappingTarget InventoryItem entity);

    @Mapping(target = "id", expression = "java(entity.getId().toString())")
    @Mapping(target = "inventoryItemId", expression = "java(entity.getInventoryItemId().toString())")
    @Mapping(target = "createdAt", expression = "java(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)")
    StockMovementResponse toMovementResponse(StockMovement entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "inventoryItemId", expression = "java(java.util.UUID.fromString(request.getInventoryItemId()))")
    StockMovement toMovementEntity(CreateStockMovementRequest request);
}
