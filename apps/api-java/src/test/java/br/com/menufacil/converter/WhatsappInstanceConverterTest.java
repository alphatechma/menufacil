package br.com.menufacil.converter;

import br.com.menufacil.domain.enums.WhatsappInstanceStatus;
import br.com.menufacil.domain.models.WhatsappInstance;
import br.com.menufacil.dto.WhatsappInstanceResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {WhatsappInstanceConverterImpl.class})
@ActiveProfiles("test")
class WhatsappInstanceConverterTest {

    @Autowired
    private WhatsappInstanceConverter converter;

    @Test
    void shouldConverterInstanciaParaResponseCompleta() {
        // Arrange
        WhatsappInstance entity = new WhatsappInstance();
        UUID id = UUID.randomUUID();
        UUID unitId = UUID.randomUUID();
        entity.setId(id);
        entity.setUnitId(unitId);
        entity.setInstanceName("menufacil-restaurante-x123");
        entity.setStatus(WhatsappInstanceStatus.connected);
        entity.setPhoneNumber("5511999998888");
        entity.setQrCode("base64-qr-code");

        // Act
        WhatsappInstanceResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(id.toString());
        assertThat(response.getInstanceName()).isEqualTo("menufacil-restaurante-x123");
        assertThat(response.getStatus()).isEqualTo(WhatsappInstanceStatus.connected);
        assertThat(response.getPhoneNumber()).isEqualTo("5511999998888");
        assertThat(response.getQrCode()).isEqualTo("base64-qr-code");
        assertThat(response.getUnitId()).isEqualTo(unitId.toString());
    }

    @Test
    void shouldConverterInstanciaSemUnitIdParaResponse() {
        // Arrange
        WhatsappInstance entity = new WhatsappInstance();
        entity.setId(UUID.randomUUID());
        entity.setInstanceName("instancia-sem-unidade");
        entity.setStatus(WhatsappInstanceStatus.disconnected);

        // Act
        WhatsappInstanceResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getUnitId()).isNull();
        assertThat(response.getPhoneNumber()).isNull();
        assertThat(response.getQrCode()).isNull();
        assertThat(response.getStatus()).isEqualTo(WhatsappInstanceStatus.disconnected);
    }

    @Test
    void shouldConverterInstanciaSemIdParaResponse() {
        // Arrange
        WhatsappInstance entity = new WhatsappInstance();
        entity.setInstanceName("nova-instancia");
        entity.setStatus(WhatsappInstanceStatus.connecting);

        // Act
        WhatsappInstanceResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isNull();
        assertThat(response.getInstanceName()).isEqualTo("nova-instancia");
        assertThat(response.getStatus()).isEqualTo(WhatsappInstanceStatus.connecting);
    }
}
