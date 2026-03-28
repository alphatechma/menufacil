package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Review;
import br.com.menufacil.dto.CreateReviewRequest;
import br.com.menufacil.dto.ReviewResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ReviewConverter {

    @Mapping(target = "id", expression = "java(entity.getId().toString())")
    @Mapping(target = "orderId", expression = "java(entity.getOrderId().toString())")
    @Mapping(target = "customerId", expression = "java(entity.getCustomerId().toString())")
    @Mapping(target = "repliedAt", expression = "java(entity.getRepliedAt() != null ? entity.getRepliedAt().toString() : null)")
    @Mapping(target = "createdAt", expression = "java(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)")
    ReviewResponse toResponse(Review entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "reply", ignore = true)
    @Mapping(target = "repliedAt", ignore = true)
    @Mapping(target = "orderId", expression = "java(java.util.UUID.fromString(request.getOrderId()))")
    @Mapping(target = "customerId", expression = "java(java.util.UUID.fromString(request.getCustomerId()))")
    Review toEntity(CreateReviewRequest request);
}
