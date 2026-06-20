package br.com.menufacil.converter;

import br.com.menufacil.domain.models.TenantUnit;
import br.com.menufacil.dto.CreateTenantUnitRequest;
import br.com.menufacil.dto.TenantUnitResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {TenantUnitConverterImpl.class})
@ActiveProfiles("test")
class TenantUnitConverterTest {

    @Autowired
    private TenantUnitConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        TenantUnit entity = new TenantUnit();
        entity.setId(UUID.randomUUID());
        entity.setName("Unidade Centro");
        entity.setSlug("centro");
        entity.setAddress("Rua A, 100");
        entity.setPhone("11999999999");
        entity.setBusinessHours("{\"monday\":{\"open\":true}}");
        entity.setActive(true);
        entity.setHeadquarters(true);
        entity.setOrderModes("{\"delivery\":true}");

        // Act
        TenantUnitResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(entity.getId().toString());
        assertThat(response.getName()).isEqualTo("Unidade Centro");
        assertThat(response.getSlug()).isEqualTo("centro");
        assertThat(response.getAddress()).isEqualTo("Rua A, 100");
        assertThat(response.getPhone()).isEqualTo("11999999999");
        assertThat(response.getBusinessHours()).isEqualTo("{\"monday\":{\"open\":true}}");
        assertThat(response.isActive()).isTrue();
        assertThat(response.isHeadquarters()).isTrue();
        assertThat(response.getOrderModes()).isEqualTo("{\"delivery\":true}");
    }

    @Test
    void shouldConverterRequestParaEntity() {
        // Arrange
        CreateTenantUnitRequest request = new CreateTenantUnitRequest();
        request.setName("Unidade Bairro");
        request.setSlug("bairro");
        request.setAddress("Rua B, 200");
        request.setPhone("11888888888");
        request.setBusinessHours("{\"tuesday\":{\"open\":false}}");
        request.setIsActive(true);
        request.setOrderModes("{\"pickup\":true}");

        // Act
        TenantUnit entity = converter.toEntity(request);

        // Assert
        assertThat(entity).isNotNull();
        assertThat(entity.getId()).isNull();
        assertThat(entity.getTenantId()).isNull();
        assertThat(entity.getName()).isEqualTo("Unidade Bairro");
        assertThat(entity.getSlug()).isEqualTo("bairro");
        assertThat(entity.getAddress()).isEqualTo("Rua B, 200");
        assertThat(entity.getPhone()).isEqualTo("11888888888");
        assertThat(entity.getBusinessHours()).isEqualTo("{\"tuesday\":{\"open\":false}}");
        assertThat(entity.isActive()).isTrue();
        assertThat(entity.getOrderModes()).isEqualTo("{\"pickup\":true}");
        // headquarters é controlado pelo service, não pelo converter
        assertThat(entity.isHeadquarters()).isFalse();
    }

    @Test
    void shouldAtualizarEntityComDadosDoRequest() {
        // Arrange
        TenantUnit entity = new TenantUnit();
        entity.setId(UUID.randomUUID());
        entity.setTenantId(UUID.randomUUID());
        entity.setName("Antigo");
        entity.setSlug("antigo-slug");
        entity.setPhone("0000");
        entity.setActive(true);
        entity.setHeadquarters(true);

        CreateTenantUnitRequest request = new CreateTenantUnitRequest();
        request.setName("Novo");
        request.setSlug("novo-slug");
        request.setAddress("Rua Atualizada");
        request.setPhone("1111");
        request.setIsActive(false);

        UUID originalTenantId = entity.getTenantId();
        UUID originalId = entity.getId();

        // Act
        converter.updateFromRequest(request, entity);

        // Assert
        assertThat(entity.getName()).isEqualTo("Novo");
        assertThat(entity.getAddress()).isEqualTo("Rua Atualizada");
        assertThat(entity.getPhone()).isEqualTo("1111");
        assertThat(entity.isActive()).isFalse();
        // Slug é ignorado pelo converter (controlado pelo service)
        assertThat(entity.getSlug()).isEqualTo("antigo-slug");
        // Id, tenantId e headquarters devem ser preservados
        assertThat(entity.getId()).isEqualTo(originalId);
        assertThat(entity.getTenantId()).isEqualTo(originalTenantId);
        assertThat(entity.isHeadquarters()).isTrue();
    }
}
