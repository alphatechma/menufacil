package br.com.menufacil.service.whatsapp;

import br.com.menufacil.converter.WhatsappInstanceConverter;
import br.com.menufacil.domain.enums.WhatsappInstanceStatus;
import br.com.menufacil.domain.models.WhatsappInstance;
import br.com.menufacil.dto.ConnectInstanceRequest;
import br.com.menufacil.dto.WhatsappInstanceResponse;
import br.com.menufacil.repository.WhatsappInstanceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsappInstanceServiceTest {

    @Mock private WhatsappInstanceRepository instanceRepository;
    @Mock private WhatsappInstanceConverter instanceConverter;
    @Mock private EvolutionApiService evolutionApiService;

    @InjectMocks
    private WhatsappInstanceService instanceService;

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        tenantId = UUID.randomUUID();
    }

    @Test
    void shouldListarInstanciasDoTenant() {
        // Arrange
        WhatsappInstance i1 = new WhatsappInstance();
        when(instanceRepository.findByTenantId(tenantId)).thenReturn(List.of(i1));
        when(instanceConverter.toResponse(i1))
                .thenReturn(WhatsappInstanceResponse.builder().instanceName("a").build());

        // Act
        List<WhatsappInstanceResponse> result = instanceService.listByTenant(tenantId);

        // Assert
        assertThat(result).hasSize(1);
    }

    @Test
    void shouldConectarNovaInstanciaQuandoNaoExiste() {
        // Arrange
        ConnectInstanceRequest request = new ConnectInstanceRequest();
        request.setInstanceName("nova-instancia");

        when(instanceRepository.findByInstanceName("nova-instancia"))
                .thenReturn(Optional.empty());
        when(evolutionApiService.connectInstance("nova-instancia"))
                .thenReturn(new EvolutionApiService.InstanceStatusResponse(
                        "connecting", null, "qr-base64"));
        when(instanceRepository.save(any(WhatsappInstance.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(instanceConverter.toResponse(any(WhatsappInstance.class)))
                .thenReturn(WhatsappInstanceResponse.builder()
                        .instanceName("nova-instancia").qrCode("qr-base64").build());

        // Act
        WhatsappInstanceResponse response = instanceService.connect(tenantId, request);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getInstanceName()).isEqualTo("nova-instancia");
        assertThat(response.getQrCode()).isEqualTo("qr-base64");
        verify(evolutionApiService).createInstance(eq("nova-instancia"), any());
        verify(instanceRepository).save(any(WhatsappInstance.class));
    }

    @Test
    void shouldReconectarInstanciaExistenteEmStatusDesconectado() {
        // Arrange
        ConnectInstanceRequest request = new ConnectInstanceRequest();
        request.setInstanceName("existente");

        WhatsappInstance existing = new WhatsappInstance();
        existing.setTenantId(tenantId);
        existing.setInstanceName("existente");
        existing.setStatus(WhatsappInstanceStatus.disconnected);

        when(instanceRepository.findByInstanceName("existente"))
                .thenReturn(Optional.of(existing));
        when(evolutionApiService.connectInstance("existente"))
                .thenReturn(new EvolutionApiService.InstanceStatusResponse(
                        "connecting", null, "qr-novo"));
        when(instanceRepository.save(any(WhatsappInstance.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(instanceConverter.toResponse(any(WhatsappInstance.class)))
                .thenReturn(WhatsappInstanceResponse.builder().qrCode("qr-novo").build());

        // Act
        WhatsappInstanceResponse response = instanceService.connect(tenantId, request);

        // Assert
        assertThat(response.getQrCode()).isEqualTo("qr-novo");
        assertThat(existing.getStatus()).isEqualTo(WhatsappInstanceStatus.connecting);
    }

    @Test
    void shouldLancarErroAoConectarInstanciaJaConectada() {
        // Arrange
        ConnectInstanceRequest request = new ConnectInstanceRequest();
        request.setInstanceName("conectada");

        WhatsappInstance existing = new WhatsappInstance();
        existing.setTenantId(tenantId);
        existing.setInstanceName("conectada");
        existing.setStatus(WhatsappInstanceStatus.connected);

        when(instanceRepository.findByInstanceName("conectada"))
                .thenReturn(Optional.of(existing));

        // Act + Assert
        assertThatThrownBy(() -> instanceService.connect(tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));

        verify(evolutionApiService, never()).connectInstance(anyString());
    }



    @Test
    void shouldLancarForbiddenAoConectarInstanciaDeOutroTenant() {
        // Arrange
        ConnectInstanceRequest request = new ConnectInstanceRequest();
        request.setInstanceName("alheia");

        WhatsappInstance existing = new WhatsappInstance();
        existing.setTenantId(UUID.randomUUID());
        existing.setInstanceName("alheia");
        existing.setStatus(WhatsappInstanceStatus.disconnected);

        when(instanceRepository.findByInstanceName("alheia"))
                .thenReturn(Optional.of(existing));

        // Act + Assert
        assertThatThrownBy(() -> instanceService.connect(tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void shouldDesconectarInstanciaEAtualizarStatus() {
        // Arrange
        WhatsappInstance existing = new WhatsappInstance();
        existing.setTenantId(tenantId);
        existing.setInstanceName("instancia-x");
        existing.setStatus(WhatsappInstanceStatus.connected);
        existing.setPhoneNumber("5511999998888");

        when(instanceRepository.findByInstanceName("instancia-x"))
                .thenReturn(Optional.of(existing));
        when(instanceRepository.save(existing)).thenReturn(existing);
        when(instanceConverter.toResponse(existing))
                .thenReturn(WhatsappInstanceResponse.builder().build());

        // Act
        WhatsappInstanceResponse response = instanceService.disconnect(tenantId, "instancia-x");

        // Assert
        assertThat(response).isNotNull();
        assertThat(existing.getStatus()).isEqualTo(WhatsappInstanceStatus.disconnected);
        assertThat(existing.getPhoneNumber()).isNull();
        assertThat(existing.getQrCode()).isNull();
        verify(evolutionApiService).disconnectInstance("instancia-x");
    }

    @Test
    void shouldLancarNotFoundAoBuscarStatusDeInstanciaInexistente() {
        // Arrange
        when(instanceRepository.findByInstanceName("nao-existe"))
                .thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> instanceService.getStatus(tenantId, "nao-existe"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void shouldAtualizarStatusParaConnectedQuandoEvolutionRetornaOpen() {
        // Arrange
        WhatsappInstance existing = new WhatsappInstance();
        existing.setTenantId(tenantId);
        existing.setInstanceName("instancia-y");
        existing.setStatus(WhatsappInstanceStatus.connecting);

        when(instanceRepository.findByInstanceName("instancia-y"))
                .thenReturn(Optional.of(existing));
        when(evolutionApiService.getInstanceStatus("instancia-y"))
                .thenReturn(new EvolutionApiService.InstanceStatusResponse(
                        "open", "5511999998888", null));
        when(instanceRepository.saveAndFlush(existing)).thenReturn(existing);
        when(instanceConverter.toResponse(existing))
                .thenReturn(WhatsappInstanceResponse.builder()
                        .status(WhatsappInstanceStatus.connected)
                        .phoneNumber("5511999998888").build());

        // Act
        WhatsappInstanceResponse response = instanceService.getStatus(tenantId, "instancia-y");

        // Assert
        assertThat(response.getStatus()).isEqualTo(WhatsappInstanceStatus.connected);
        assertThat(existing.getStatus()).isEqualTo(WhatsappInstanceStatus.connected);
        assertThat(existing.getPhoneNumber()).isEqualTo("5511999998888");
    }

}
