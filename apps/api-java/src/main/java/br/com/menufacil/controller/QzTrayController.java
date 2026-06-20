package br.com.menufacil.controller;

import br.com.menufacil.dto.SignRequest;
import br.com.menufacil.dto.SignResponse;
import br.com.menufacil.service.QzTrayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "QZ Tray", description = "Integração PKI para impressão local via QZ Tray (rotas públicas)")
@RestController
@RequestMapping("/qz-tray")
@RequiredArgsConstructor
public class QzTrayController {

    private final QzTrayService qzTrayService;

    @Operation(summary = "Obter o certificado digital do QZ Tray em formato texto")
    @GetMapping(value = "/certificate", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getCertificate() {
        return ResponseEntity.ok(qzTrayService.getCertificate());
    }

    @Operation(summary = "Assinar mensagem usando SHA256withRSA e retornar a assinatura em Base64")
    @PostMapping("/sign")
    public ResponseEntity<SignResponse> sign(@Valid @RequestBody SignRequest request) {
        String signature = qzTrayService.sign(request.getMessage());
        return ResponseEntity.ok(SignResponse.builder().signature(signature).build());
    }

    @Operation(summary = "Baixar o certificado digital como arquivo (.crt)")
    @GetMapping(value = "/certificate/download", produces = "application/x-x509-ca-cert")
    public ResponseEntity<String> downloadCertificate() {
        String certificate = qzTrayService.getCertificate();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"menufacil-qz.crt\"")
                .body(certificate);
    }

    @Operation(summary = "Gerar script de configuração do QZ Tray para a plataforma informada")
    @GetMapping(value = "/setup-script", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> getSetupScript(
            @RequestParam(name = "platform", required = false, defaultValue = "linux") String platform) {
        return ResponseEntity.ok(qzTrayService.generateSetupScript(platform));
    }
}
