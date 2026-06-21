package br.com.menufacil.service.notification;

import br.com.menufacil.domain.models.WhatsappInstance;
import br.com.menufacil.repository.WhatsappInstanceRepository;
import br.com.menufacil.service.whatsapp.EvolutionApiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EvolutionWhatsappSenderTest {

    @Mock private EvolutionApiService evolutionApiService;
    @Mock private WhatsappInstanceRepository whatsappInstanceRepository;

    @InjectMocks
    private EvolutionWhatsappSender sender;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldEnviarMensagemUsandoInstanciaDefaultDoTenant() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        WhatsappInstance instance = new WhatsappInstance();
        instance.setInstanceName("tenant-default");

        when(whatsappInstanceRepository.findFirstByTenantIdOrderByCreatedAtAsc(tenantId))
                .thenReturn(Optional.of(instance));
        when(evolutionApiService.sendTextMessage(anyString(), anyString(), anyString()))
                .thenReturn(Map.of("status", "sent"));

        // Act
        sender.send(tenantId, "+5511988887777", "Pedido confirmado");

        // Assert
        verify(evolutionApiService)
                .sendTextMessage(eq("tenant-default"), eq("+5511988887777"), eq("Pedido confirmado"));
    }

    @Test
    void shouldLancarExcecaoQuandoTenantNaoTemInstanciaConfigurada() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        when(whatsappInstanceRepository.findFirstByTenantIdOrderByCreatedAtAsc(tenantId))
                .thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> sender.send(tenantId, "+5511988887777", "msg"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Tenant nao tem instancia WhatsApp configurada");

        verify(evolutionApiService, never()).sendTextMessage(any(), any(), any());
    }
}
