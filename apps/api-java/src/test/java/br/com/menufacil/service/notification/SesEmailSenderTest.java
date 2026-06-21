package br.com.menufacil.service.notification;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;
import software.amazon.awssdk.services.sesv2.model.SendEmailResponse;
import software.amazon.awssdk.services.sesv2.model.SesV2Exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SesEmailSenderTest {

    private SesV2Client sesClient;
    private SesEmailSender sender;

    @BeforeEach
    void setUp() {
        sesClient = mock(SesV2Client.class);
        sender = new SesEmailSender();
        ReflectionTestUtils.setField(sender, "region", "us-east-1");
        ReflectionTestUtils.setField(sender, "accessKey", "fake-access");
        ReflectionTestUtils.setField(sender, "secretKey", "fake-secret");
        ReflectionTestUtils.setField(sender, "fromEmail", "noreply@menufacil.com.br");
        ReflectionTestUtils.setField(sender, "sesClient", sesClient);
    }

    @Test
    void shouldConstruirSendEmailRequestComCamposCorretos() {
        // Arrange
        when(sesClient.sendEmail(any(SendEmailRequest.class)))
                .thenReturn(SendEmailResponse.builder().messageId("msg-123").build());

        // Act
        sender.send("cliente@example.com", "Assunto X", "Corpo do email");

        // Assert
        ArgumentCaptor<SendEmailRequest> captor = ArgumentCaptor.forClass(SendEmailRequest.class);
        verify(sesClient).sendEmail(captor.capture());

        SendEmailRequest request = captor.getValue();
        assertThat(request.fromEmailAddress()).isEqualTo("noreply@menufacil.com.br");
        assertThat(request.destination().toAddresses()).containsExactly("cliente@example.com");
        assertThat(request.content().simple().subject().data()).isEqualTo("Assunto X");
        assertThat(request.content().simple().subject().charset()).isEqualTo("UTF-8");
        assertThat(request.content().simple().body().text().data()).isEqualTo("Corpo do email");
        assertThat(request.content().simple().body().text().charset()).isEqualTo("UTF-8");
    }

    @Test
    void shouldPropagarExcecaoQuandoSesFalha() {
        // Arrange
        when(sesClient.sendEmail(any(SendEmailRequest.class)))
                .thenThrow(SesV2Exception.builder().message("ses down").build());

        // Act + Assert
        assertThatThrownBy(() -> sender.send("x@example.com", "S", "B"))
                .isInstanceOf(SesV2Exception.class)
                .hasMessageContaining("ses down");
    }
}
