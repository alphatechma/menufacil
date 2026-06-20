package br.com.menufacil.controller.whatsapp;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateWhatsappTemplateRequest;
import br.com.menufacil.dto.WhatsappTemplateResponse;
import br.com.menufacil.service.whatsapp.WhatsappTemplateService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsappTemplateControllerTest {

    @Mock private WhatsappTemplateService templateService;

    @InjectMocks
    private WhatsappTemplateController controller;

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenant("tenant-slug", tenantId.toString());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void shouldListarTemplates() {
        // Arrange
        when(templateService.listByTenant(tenantId))
                .thenReturn(List.of(WhatsappTemplateResponse.builder().build()));

        // Act
        ResponseEntity<List<WhatsappTemplateResponse>> response = controller.list();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        verify(templateService).listByTenant(tenantId);
    }

    @Test
    void shouldCriarTemplate() {
        // Arrange
        CreateWhatsappTemplateRequest request = new CreateWhatsappTemplateRequest();
        request.setName("Boas-vindas");
        request.setTemplateContent("Olá!");
        when(templateService.create(eq(tenantId), any(CreateWhatsappTemplateRequest.class)))
                .thenReturn(WhatsappTemplateResponse.builder().name("Boas-vindas").build());

        // Act
        ResponseEntity<WhatsappTemplateResponse> response = controller.create(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Boas-vindas");
    }

    @Test
    void shouldAtualizarTemplate() {
        // Arrange
        UUID id = UUID.randomUUID();
        CreateWhatsappTemplateRequest request = new CreateWhatsappTemplateRequest();
        request.setName("Atualizado");
        request.setTemplateContent("Novo conteudo");
        when(templateService.update(eq(id), eq(tenantId), any(CreateWhatsappTemplateRequest.class)))
                .thenReturn(WhatsappTemplateResponse.builder().name("Atualizado").build());

        // Act
        ResponseEntity<WhatsappTemplateResponse> response = controller.update(id, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Atualizado");
    }

    @Test
    void shouldDeletarTemplate() {
        // Arrange
        UUID id = UUID.randomUUID();

        // Act
        ResponseEntity<Void> response = controller.delete(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(templateService).delete(id, tenantId);
    }
}
