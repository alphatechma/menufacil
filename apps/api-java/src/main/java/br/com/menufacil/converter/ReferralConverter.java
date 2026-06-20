package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Referral;
import br.com.menufacil.dto.ReferralResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ReferralConverter {

    @Mapping(target = "id", expression = "java(referral.getId() != null ? referral.getId().toString() : null)")
    @Mapping(target = "referrerId", expression = "java(referral.getReferrerId() != null ? referral.getReferrerId().toString() : null)")
    @Mapping(target = "referredId", expression = "java(referral.getReferredId() != null ? referral.getReferredId().toString() : null)")
    ReferralResponse toResponse(Referral referral);
}
