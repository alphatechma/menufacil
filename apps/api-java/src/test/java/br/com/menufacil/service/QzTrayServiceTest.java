package br.com.menufacil.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class QzTrayServiceTest {

    private QzTrayService qzTrayService;
    private String certificatePem;
    private String privateKeyPem;
    private PublicKey publicKey;

    @BeforeEach
    void setUp() throws Exception {
        qzTrayService = new QzTrayService();

        // Gera um par de chaves RSA real para usar nos testes de assinatura
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair keyPair = generator.generateKeyPair();
        PrivateKey privateKey = keyPair.getPrivate();
        publicKey = keyPair.getPublic();

        String encodedKey = Base64.getEncoder().encodeToString(privateKey.getEncoded());
        privateKeyPem = "-----BEGIN PRIVATE KEY-----\n" + encodedKey + "\n-----END PRIVATE KEY-----";

        certificatePem = "-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----";
    }

    @Test
    void shouldRetornarCertificadoQuandoArquivoExiste() {
        // Arrange + Act + Assert
        try (MockedStatic<Files> filesMock = Mockito.mockStatic(Files.class)) {
            filesMock.when(() -> Files.readString(Path.of("/certs/digital-certificate.txt")))
                    .thenReturn(certificatePem);

            String result = qzTrayService.getCertificate();

            assertThat(result).isEqualTo(certificatePem);
        }
    }

    @Test
    void shouldLancarNotFoundQuandoCertificadoNaoExiste() {
        // Arrange + Act + Assert
        try (MockedStatic<Files> filesMock = Mockito.mockStatic(Files.class)) {
            filesMock.when(() -> Files.readString(Path.of("/certs/digital-certificate.txt")))
                    .thenThrow(new IOException("arquivo não encontrado"));

            assertThatThrownBy(() -> qzTrayService.getCertificate())
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("Certificado QZ Tray não encontrado");
        }
    }

    @Test
    void shouldAssinarMensagemComChavePrivada() throws Exception {
        // Arrange
        String message = "mensagem-de-teste";

        try (MockedStatic<Files> filesMock = Mockito.mockStatic(Files.class)) {
            filesMock.when(() -> Files.readString(Path.of("/certs/private.key")))
                    .thenReturn(privateKeyPem);

            // Act
            String signatureBase64 = qzTrayService.sign(message);

            // Assert
            assertThat(signatureBase64).isNotBlank();

            byte[] signatureBytes = Base64.getDecoder().decode(signatureBase64);
            Signature verifier = Signature.getInstance("SHA256withRSA");
            verifier.initVerify(publicKey);
            verifier.update(message.getBytes());
            assertThat(verifier.verify(signatureBytes)).isTrue();
        }
    }

    @Test
    void shouldLancarNotFoundQuandoChavePrivadaAusente() {
        // Arrange + Act + Assert
        try (MockedStatic<Files> filesMock = Mockito.mockStatic(Files.class)) {
            filesMock.when(() -> Files.readString(Path.of("/certs/private.key")))
                    .thenThrow(new IOException("sem chave"));

            // System.getenv("QZ_PRIVATE_KEY") provavelmente é null no ambiente de testes
            assertThatThrownBy(() -> qzTrayService.sign("qualquer"))
                    .isInstanceOf(ResponseStatusException.class);
        }
    }

    @Test
    void shouldGerarScriptParaLinux() {
        // Arrange + Act
        String script = qzTrayService.generateSetupScript("linux");

        // Assert
        assertThat(script).isNotBlank();
        assertThat(script).contains("#!/bin/bash");
        assertThat(script).contains("https://qz.io/download/");
    }

    @Test
    void shouldGerarScriptParaMacOS() {
        // Arrange + Act
        String script = qzTrayService.generateSetupScript("macos");

        // Assert
        assertThat(script).isNotBlank();
        assertThat(script).contains("#!/bin/bash");
        assertThat(script).contains("macOS");
    }

    @Test
    void shouldGerarScriptParaWindows() {
        // Arrange + Act
        String script = qzTrayService.generateSetupScript("windows");

        // Assert
        assertThat(script).isNotBlank();
        assertThat(script).contains("@echo off");
        assertThat(script).contains("QZ Tray");
    }

    @Test
    void shouldLancarBadRequestParaPlataformaInvalida() {
        // Arrange + Act + Assert
        assertThatThrownBy(() -> qzTrayService.generateSetupScript("solaris"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Plataforma não suportada");
    }

    @Test
    void shouldUsarLinuxComoPlataformaPadraoQuandoNull() {
        // Arrange + Act
        String script = qzTrayService.generateSetupScript(null);

        // Assert
        assertThat(script).isNotBlank();
        assertThat(script).contains("#!/bin/bash");
    }
}
