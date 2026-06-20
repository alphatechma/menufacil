package br.com.menufacil.converter;

import br.com.menufacil.domain.enums.PaymentMethod;
import br.com.menufacil.domain.enums.PaymentStatus;
import br.com.menufacil.domain.models.PaymentTransaction;
import br.com.menufacil.dto.PaymentResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {PaymentConverterImpl.class})
@ActiveProfiles("test")
class PaymentConverterTest {

    @Autowired
    private PaymentConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        PaymentTransaction entity = new PaymentTransaction();
        entity.setId(UUID.randomUUID());
        entity.setOrderId(UUID.randomUUID());
        entity.setMethod(PaymentMethod.pix);
        entity.setStatus(PaymentStatus.pending);
        entity.setExternalId("ext-123");
        entity.setAmount(new BigDecimal("50.00"));
        entity.setPixQrCode("STUB_QR");
        entity.setPixCopyPaste("STUB_COPYPASTE");

        // Act
        PaymentResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(entity.getId().toString());
        assertThat(response.getOrderId()).isEqualTo(entity.getOrderId().toString());
        assertThat(response.getMethod()).isEqualTo("pix");
        assertThat(response.getStatus()).isEqualTo("pending");
        assertThat(response.getExternalId()).isEqualTo("ext-123");
        assertThat(response.getAmount()).isEqualByComparingTo("50.00");
        assertThat(response.getPixQrCode()).isEqualTo("STUB_QR");
        assertThat(response.getPixCopyPaste()).isEqualTo("STUB_COPYPASTE");
    }

    @Test
    void shouldConverterEntityComCamposNulosSemErro() {
        // Arrange
        PaymentTransaction entity = new PaymentTransaction();
        entity.setAmount(new BigDecimal("10.00"));

        // Act
        PaymentResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isNull();
        assertThat(response.getOrderId()).isNull();
        assertThat(response.getMethod()).isNull();
        assertThat(response.getStatus()).isEqualTo("pending");
        assertThat(response.getAmount()).isEqualByComparingTo("10.00");
    }

    @Test
    void shouldConverterStatusEMetodoComoString() {
        // Arrange
        PaymentTransaction entity = new PaymentTransaction();
        entity.setId(UUID.randomUUID());
        entity.setMethod(PaymentMethod.credit_card);
        entity.setStatus(PaymentStatus.approved);
        entity.setAmount(new BigDecimal("100.00"));

        // Act
        PaymentResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response.getMethod()).isEqualTo("credit_card");
        assertThat(response.getStatus()).isEqualTo("approved");
    }
}
