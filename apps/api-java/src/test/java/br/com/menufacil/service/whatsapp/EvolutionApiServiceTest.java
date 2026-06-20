package br.com.menufacil.service.whatsapp;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@SuppressWarnings({"unchecked", "rawtypes"})
class EvolutionApiServiceTest {

    @Mock private RestClient restClient;
    @Mock private RestClient.RequestHeadersUriSpec getUriSpec;
    @Mock private RestClient.RequestHeadersSpec getSpec;
    @Mock private RestClient.RequestBodyUriSpec postUriSpec;
    @Mock private RestClient.RequestBodySpec postSpec;
    @Mock private RestClient.RequestHeadersUriSpec deleteUriSpec;
    @Mock private RestClient.RequestHeadersSpec deleteSpec;
    @Mock private RestClient.ResponseSpec responseSpec;

    private EvolutionApiService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new EvolutionApiService("http://localhost:8080", "test-key");
        service.setRestClient(restClient);

        when(restClient.get()).thenReturn(getUriSpec);
        when(getUriSpec.uri(any(String.class))).thenReturn(getSpec);
        when(getSpec.retrieve()).thenReturn(responseSpec);

        when(restClient.post()).thenReturn(postUriSpec);
        when(postUriSpec.uri(any(String.class))).thenReturn(postSpec);
        when(postSpec.body(any(Object.class))).thenReturn(postSpec);
        when(postSpec.retrieve()).thenReturn(responseSpec);

        when(restClient.delete()).thenReturn(deleteUriSpec);
        when(deleteUriSpec.uri(any(String.class))).thenReturn(deleteSpec);
        when(deleteSpec.retrieve()).thenReturn(responseSpec);
    }

    @Test
    void shouldCriarInstanciaComSucesso() {
        // Arrange
        when(responseSpec.body(eq(Map.class))).thenReturn(Map.of("status", "created"));

        // Act
        Map<String, Object> result = service.createInstance("instancia-1", "http://wh");

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.get("status")).isEqualTo("created");
    }

    @Test
    void shouldLancarBadGatewayQuandoCreateInstanceFalhar() {
        // Arrange
        when(responseSpec.body(eq(Map.class))).thenThrow(new ResourceAccessException("boom"));

        // Act + Assert
        assertThatThrownBy(() -> service.createInstance("instancia-1", null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_GATEWAY));
    }

    @Test
    void shouldRetornarQrCodeQuandoConectarInstancia() {
        // Arrange
        when(responseSpec.body(eq(Map.class)))
                .thenReturn(Map.of("base64", "qr-base64-conteudo"));

        // Act
        EvolutionApiService.InstanceStatusResponse result = service.connectInstance("instancia-1");

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.qrCode()).isEqualTo("qr-base64-conteudo");
        assertThat(result.status()).isEqualTo("connecting");
    }

    @Test
    void shouldRetornarStatusOpenComPhoneNumberLimpo() {
        // Arrange
        Map<String, Object> instanceMap = Map.of(
                "state", "open",
                "owner", "5511999998888@s.whatsapp.net"
        );
        when(responseSpec.body(eq(Map.class))).thenReturn(Map.of("instance", instanceMap));

        // Act
        EvolutionApiService.InstanceStatusResponse result = service.getInstanceStatus("instancia-1");

        // Assert
        assertThat(result.status()).isEqualTo("open");
        assertThat(result.phoneNumber()).isEqualTo("5511999998888");
    }

    @Test
    void shouldDesconectarInstanciaChamadoLogoutEDelete() {
        // Arrange
        when(responseSpec.body(eq(Map.class))).thenReturn(Map.of("ok", true));

        // Act
        Map<String, Object> result = service.disconnectInstance("instancia-1");

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.get("ok")).isEqualTo(true);
    }

    @Test
    void shouldEnviarMensagemDeTexto() {
        // Arrange
        when(responseSpec.body(eq(Map.class))).thenReturn(Map.of("messageId", "abc-123"));

        // Act
        Map<String, Object> result = service.sendTextMessage("instancia-1",
                "5511999998888", "Olá mundo");

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.get("messageId")).isEqualTo("abc-123");
    }

    @Test
    void shouldEnviarTemplateComVariaveis() {
        // Arrange
        when(responseSpec.body(eq(Map.class))).thenReturn(Map.of("sent", true));

        // Act
        Map<String, Object> result = service.sendTemplate("instancia-1",
                "5511999998888", "boas_vindas", Map.of("nome", "João"));

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.get("sent")).isEqualTo(true);
    }
}
