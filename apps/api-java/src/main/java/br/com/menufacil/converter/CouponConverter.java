package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Coupon;
import br.com.menufacil.dto.CouponResponse;
import br.com.menufacil.dto.CreateCouponRequest;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CouponConverter {

    @Mapping(target = "id", expression = "java(entity.getId().toString())")
    @Mapping(target = "validFrom", expression = "java(entity.getValidFrom() != null ? entity.getValidFrom().toString() : null)")
    @Mapping(target = "validTo", expression = "java(entity.getValidTo() != null ? entity.getValidTo().toString() : null)")
    @Mapping(target = "createdAt", expression = "java(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)")
    CouponResponse toResponse(Coupon entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "currentUses", ignore = true)
    @Mapping(target = "active", source = "isActive")
    @Mapping(target = "validFrom", expression = "java(request.getValidFrom() != null ? java.time.LocalDateTime.parse(request.getValidFrom()) : null)")
    @Mapping(target = "validTo", expression = "java(request.getValidTo() != null ? java.time.LocalDateTime.parse(request.getValidTo()) : null)")
    Coupon toEntity(CreateCouponRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "currentUses", ignore = true)
    @Mapping(target = "active", source = "isActive")
    @Mapping(target = "validFrom", expression = "java(request.getValidFrom() != null ? java.time.LocalDateTime.parse(request.getValidFrom()) : null)")
    @Mapping(target = "validTo", expression = "java(request.getValidTo() != null ? java.time.LocalDateTime.parse(request.getValidTo()) : null)")
    void updateFromRequest(CreateCouponRequest request, @MappingTarget Coupon entity);
}
