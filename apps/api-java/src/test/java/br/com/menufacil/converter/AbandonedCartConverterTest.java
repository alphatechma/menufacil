package br.com.menufacil.converter;

import br.com.menufacil.domain.models.AbandonedCart;
import br.com.menufacil.dto.AbandonedCartResponse;
import br.com.menufacil.dto.SaveAbandonedCartRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {AbandonedCartConverterImpl.class})
@ActiveProfiles("test")
class AbandonedCartConverterTest {

    @Autowired
    private AbandonedCartConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        AbandonedCart entity = new AbandonedCart();
        entity.setId(UUID.randomUUID());
        entity.setCustomerId(UUID.randomUUID());
        entity.setItems("[{\"productId\":\"1\"}]");
        entity.setTotal(new BigDecimal("99.90"));
        entity.setRecovered(false);
        entity.setNotificationSent(false);

        // Act
        AbandonedCartResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(entity.getId().toString());
        assertThat(response.getCustomerId()).isEqualTo(entity.getCustomerId().toString());
        assertThat(response.getItems()).isEqualTo("[{\"productId\":\"1\"}]");
        assertThat(response.getTotal()).isEqualByComparingTo(new BigDecimal("99.90"));
        assertThat(response.isRecovered()).isFalse();
    }

    @Test
    void shouldConverterRequestParaEntity() {
        // Arrange
        SaveAbandonedCartRequest request = new SaveAbandonedCartRequest();
        request.setCustomerId(UUID.randomUUID());
        request.setItems("[{\"productId\":\"abc\",\"qty\":2}]");
        request.setTotal(new BigDecimal("150.00"));

        // Act
        AbandonedCart entity = converter.toEntity(request);

        // Assert
        assertThat(entity).isNotNull();
        assertThat(entity.getCustomerId()).isEqualTo(request.getCustomerId());
        assertThat(entity.getItems()).isEqualTo(request.getItems());
        assertThat(entity.getTotal()).isEqualByComparingTo(new BigDecimal("150.00"));
        assertThat(entity.getId()).isNull();
        assertThat(entity.getTenantId()).isNull();
        assertThat(entity.isRecovered()).isFalse();
    }

    @Test
    void shouldAtualizarEntityComDadosDoRequest() {
        // Arrange
        AbandonedCart entity = new AbandonedCart();
        entity.setId(UUID.randomUUID());
        entity.setCustomerId(UUID.randomUUID());
        entity.setItems("[]");
        entity.setTotal(BigDecimal.ZERO);

        SaveAbandonedCartRequest request = new SaveAbandonedCartRequest();
        request.setCustomerId(UUID.randomUUID());
        request.setItems("[{\"new\":true}]");
        request.setTotal(new BigDecimal("200.50"));

        // Act
        converter.updateFromRequest(request, entity);

        // Assert
        assertThat(entity.getItems()).isEqualTo("[{\"new\":true}]");
        assertThat(entity.getTotal()).isEqualByComparingTo(new BigDecimal("200.50"));
        assertThat(entity.getCustomerId()).isEqualTo(request.getCustomerId());
    }
}
