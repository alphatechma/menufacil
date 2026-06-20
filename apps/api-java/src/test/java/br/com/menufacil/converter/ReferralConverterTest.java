package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Referral;
import br.com.menufacil.dto.ReferralResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {ReferralConverterImpl.class})
@ActiveProfiles("test")
class ReferralConverterTest {

    @Autowired
    private ReferralConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID referrerId = UUID.randomUUID();
        UUID referredId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();

        Referral entity = new Referral();
        entity.setId(id);
        entity.setReferrerId(referrerId);
        entity.setReferredId(referredId);
        entity.setCode("ABCD1234");
        entity.setRewardGiven(true);
        entity.setPointsAwarded(10);
        entity.setCreatedAt(now);

        // Act
        ReferralResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(id.toString());
        assertThat(response.getReferrerId()).isEqualTo(referrerId.toString());
        assertThat(response.getReferredId()).isEqualTo(referredId.toString());
        assertThat(response.getCode()).isEqualTo("ABCD1234");
        assertThat(response.isRewardGiven()).isTrue();
        assertThat(response.getPointsAwarded()).isEqualTo(10);
        assertThat(response.getCreatedAt()).isEqualTo(now);
    }

    @Test
    void shouldConverterReferralTemplateSemReferredIdParaResponse() {
        // Arrange — template referral (referredId nulo, ainda não foi consumido)
        UUID id = UUID.randomUUID();
        UUID referrerId = UUID.randomUUID();

        Referral entity = new Referral();
        entity.setId(id);
        entity.setReferrerId(referrerId);
        entity.setReferredId(null);
        entity.setCode("TEMPLATE1");
        entity.setRewardGiven(false);
        entity.setPointsAwarded(0);

        // Act
        ReferralResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(id.toString());
        assertThat(response.getReferrerId()).isEqualTo(referrerId.toString());
        assertThat(response.getReferredId()).isNull();
        assertThat(response.getCode()).isEqualTo("TEMPLATE1");
        assertThat(response.isRewardGiven()).isFalse();
        assertThat(response.getPointsAwarded()).isZero();
    }

    @Test
    void shouldRetornarNullQuandoEntityForNull() {
        // Act
        ReferralResponse response = converter.toResponse(null);

        // Assert
        assertThat(response).isNull();
    }
}
