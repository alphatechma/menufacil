package br.com.menufacil.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;

/**
 * Serviço responsável pela integração com QZ Tray (impressão local via PKI).
 * Lê o certificado público e a chave privada para assinar mensagens enviadas
 * ao cliente QZ Tray, evitando popups de confirmação no navegador.
 */
@Slf4j
@Service
public class QzTrayService {

    private static final String CERTIFICATE_PATH = "/certs/digital-certificate.txt";
    private static final String PRIVATE_KEY_PATH = "/certs/private.key";
    private static final String ENV_PRIVATE_KEY = "QZ_PRIVATE_KEY";

    /**
     * Retorna o conteúdo do certificado digital (PEM).
     * Lê de /certs/digital-certificate.txt.
     */
    public String getCertificate() {
        try {
            String certificate = Files.readString(Path.of(CERTIFICATE_PATH));
            if (certificate == null || certificate.isBlank()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Certificado QZ Tray não encontrado");
            }
            return certificate;
        } catch (IOException e) {
            log.warn("Não foi possível ler o certificado QZ Tray em {}: {}", CERTIFICATE_PATH, e.getMessage());
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Certificado QZ Tray não encontrado");
        }
    }

    /**
     * Assina a mensagem informada usando SHA256withRSA e a chave privada PEM.
     * Tenta primeiro o arquivo /certs/private.key; se ausente, usa a variável
     * de ambiente QZ_PRIVATE_KEY.
     *
     * @param message mensagem a ser assinada
     * @return assinatura em Base64
     */
    public String sign(String message) {
        if (message == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Mensagem é obrigatória para assinatura");
        }

        String privateKeyPem = loadPrivateKeyPem();

        try {
            PrivateKey privateKey = parsePrivateKey(privateKeyPem);

            Signature signature = Signature.getInstance("SHA256withRSA");
            signature.initSign(privateKey);
            signature.update(message.getBytes());

            byte[] signed = signature.sign();
            log.info("Mensagem assinada para QZ Tray ({} bytes)", signed.length);
            return Base64.getEncoder().encodeToString(signed);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.error("Falha ao assinar mensagem QZ Tray: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Falha ao assinar mensagem para QZ Tray");
        }
    }

    /**
     * Gera o script de configuração do QZ Tray para a plataforma informada.
     * Plataformas suportadas: "windows" (.bat), "linux" (.sh), "macos" (.sh).
     *
     * @param platform plataforma alvo
     * @return conteúdo do script
     */
    public String generateSetupScript(String platform) {
        String target = platform == null ? "linux" : platform.toLowerCase();

        return switch (target) {
            case "windows" -> buildWindowsScript();
            case "macos" -> buildUnixScript("macOS");
            case "linux" -> buildUnixScript("Linux");
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Plataforma não suportada: " + platform);
        };
    }

    private String loadPrivateKeyPem() {
        try {
            return Files.readString(Path.of(PRIVATE_KEY_PATH));
        } catch (IOException e) {
            String envKey = System.getenv(ENV_PRIVATE_KEY);
            if (envKey != null && !envKey.isBlank()) {
                return envKey.replace("\\n", "\n");
            }
            log.warn("Chave privada QZ Tray não encontrada em {} nem em env {}", PRIVATE_KEY_PATH, ENV_PRIVATE_KEY);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Chave privada QZ Tray não configurada");
        }
    }

    private PrivateKey parsePrivateKey(String pem) throws Exception {
        String cleaned = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                .replace("-----END RSA PRIVATE KEY-----", "")
                .replaceAll("\\s", "");

        byte[] decoded = Base64.getDecoder().decode(cleaned);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(decoded);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        return keyFactory.generatePrivate(spec);
    }

    private String buildUnixScript(String osLabel) {
        return String.join("\n",
                "#!/bin/bash",
                "# MenuFacil - Script de configuração do QZ Tray (" + osLabel + ")",
                "set -e",
                "",
                "echo \"=== MenuFacil - Configuração QZ Tray ===\"",
                "echo \"Instale o QZ Tray em: https://qz.io/download/\"",
                "echo \"Certificado: /opt/qz-tray/auth/menufacil.crt\"",
                "echo \"\"",
                "echo \"Após a instalação, reinicie o QZ Tray e recarregue a página do MenuFacil.\"",
                ""
        );
    }

    private String buildWindowsScript() {
        return String.join("\r\n",
                "@echo off",
                "REM MenuFacil - Script de configuração do QZ Tray (Windows)",
                "",
                "echo === MenuFacil - Configuração QZ Tray ===",
                "echo Instale o QZ Tray em: https://qz.io/download/",
                "echo Certificado: %ProgramFiles%\\QZ Tray\\auth\\menufacil.crt",
                "echo.",
                "echo Apos a instalacao, reinicie o QZ Tray e recarregue a pagina do MenuFacil.",
                "pause",
                ""
        );
    }
}
