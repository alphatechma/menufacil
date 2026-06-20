package br.com.menufacil.controller;

import br.com.menufacil.dto.SignRequest;
import br.com.menufacil.dto.SignResponse;
import br.com.menufacil.service.QzTrayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class QzTrayControllerTest {

    @Mock private QzTrayService qzTrayService;

    @InjectMocks
    private QzTrayController qzTrayController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldObterCertificado() {
        // Arrange
        String certificate = "-----BEGIN CERTIFICATE-----\nFAKE\n-----END CERTIFICATE-----";
        when(qzTrayService.getCertificate()).thenReturn(certificate);

        // Act
        ResponseEntity<String> response = qzTrayController.getCertificate();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(certificate);
    }

    @Test
    void shouldAssinarMensagem() {
        // Arrange
        SignRequest request = new SignRequest();
        request.setMessage("mensagem");
        when(qzTrayService.sign("mensagem")).thenReturn("assinaturaBase64");

        // Act
        ResponseEntity<SignResponse> response = qzTrayController.sign(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getSignature()).isEqualTo("assinaturaBase64");
        verify(qzTrayService).sign("mensagem");
    }

    @Test
    void shouldBaixarCertificadoComoArquivo() {
        // Arrange
        String certificate = "-----BEGIN CERTIFICATE-----\nFAKE\n-----END CERTIFICATE-----";
        when(qzTrayService.getCertificate()).thenReturn(certificate);

        // Act
        ResponseEntity<String> response = qzTrayController.downloadCertificate();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(certificate);
        assertThat(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION))
                .contains("menufacil-qz.crt");
    }

    @Test
    void shouldGerarScriptDeSetup() {
        // Arrange
        when(qzTrayService.generateSetupScript("linux")).thenReturn("#!/bin/bash\necho ok");

        // Act
        ResponseEntity<String> response = qzTrayController.getSetupScript("linux");

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("#!/bin/bash");
        verify(qzTrayService).generateSetupScript("linux");
    }

    @Test
    void shouldGerarScriptParaWindowsQuandoSolicitado() {
        // Arrange
        when(qzTrayService.generateSetupScript(anyString())).thenReturn("@echo off");

        // Act
        ResponseEntity<String> response = qzTrayController.getSetupScript("windows");

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo("@echo off");
        verify(qzTrayService).generateSetupScript("windows");
    }
}
