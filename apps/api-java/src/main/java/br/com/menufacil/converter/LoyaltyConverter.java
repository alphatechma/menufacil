package br.com.menufacil.converter;

import br.com.menufacil.domain.models.LoyaltyRedemption;
import br.com.menufacil.domain.models.LoyaltyReward;
import br.com.menufacil.dto.CreateLoyaltyRewardRequest;
import br.com.menufacil.dto.LoyaltyRedemptionResponse;
import br.com.menufacil.dto.LoyaltyRewardResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface LoyaltyConverter {

    @Mapping(target = "id", expression = "java(entity.getId().toString())")
    @Mapping(target = "productId", expression = "java(entity.getProductId() != null ? entity.getProductId().toString() : null)")
    @Mapping(target = "createdAt", expression = "java(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)")
    LoyaltyRewardResponse toRewardResponse(LoyaltyReward entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "active", source = "isActive")
    @Mapping(target = "productId", expression = "java(request.getProductId() != null ? java.util.UUID.fromString(request.getProductId()) : null)")
    LoyaltyReward toRewardEntity(CreateLoyaltyRewardRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "active", source = "isActive")
    @Mapping(target = "productId", expression = "java(request.getProductId() != null ? java.util.UUID.fromString(request.getProductId()) : null)")
    void updateRewardFromRequest(CreateLoyaltyRewardRequest request, @MappingTarget LoyaltyReward entity);

    @Mapping(target = "id", expression = "java(entity.getId().toString())")
    @Mapping(target = "customerId", expression = "java(entity.getCustomerId().toString())")
    @Mapping(target = "rewardId", expression = "java(entity.getRewardId().toString())")
    @Mapping(target = "expiresAt", expression = "java(entity.getExpiresAt() != null ? entity.getExpiresAt().toString() : null)")
    @Mapping(target = "createdAt", expression = "java(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)")
    LoyaltyRedemptionResponse toRedemptionResponse(LoyaltyRedemption entity);
}
