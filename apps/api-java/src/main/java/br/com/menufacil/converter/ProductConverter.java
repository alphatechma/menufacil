package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Product;
import br.com.menufacil.dto.CreateProductRequest;
import br.com.menufacil.dto.ProductResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ProductConverter {

    @Mapping(target = "id", expression = "java(product.getId().toString())")
    @Mapping(target = "categoryId", expression = "java(product.getCategoryId() != null ? product.getCategoryId().toString() : null)")
    ProductResponse toResponse(Product product);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "categoryId", expression = "java(request.getCategoryId() != null ? java.util.UUID.fromString(request.getCategoryId()) : null)")
    @Mapping(target = "active", source = "isActive")
    Product toEntity(CreateProductRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "categoryId", expression = "java(request.getCategoryId() != null ? java.util.UUID.fromString(request.getCategoryId()) : null)")
    @Mapping(target = "active", source = "isActive")
    void updateFromRequest(CreateProductRequest request, @MappingTarget Product product);
}
