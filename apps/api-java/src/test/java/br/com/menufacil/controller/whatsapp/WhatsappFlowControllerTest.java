package br.com.menufacil.controller.whatsapp;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateWhatsappFlowRequest;
import br.com.menufacil.dto.TestFlowRequest;
import br.com.menufacil.dto.TestFlowResponse;
import br.com.menufacil.dto.ValidateFlowResponse;
import br.com.menufacil.dto.WhatsappFlowResponse;
import br.com.menufacil.service.whatsapp.WhatsappFlowService;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsappFlowControllerTest {

    @Mock private WhatsappFlowService flowService;

    @InjectMocks
    private WhatsappFlowController flowController;

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
    void shouldListarFluxosDoTenant() {
        // Arrange
        when(flowService.listByTenant(tenantId))
                .thenReturn(List.of(WhatsappFlowResponse.builder().name("Boas-vindas").build()));

        // Act
        ResponseEntity<List<WhatsappFlowResponse>> response = flowController.list();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        verify(flowService).listByTenant(tenantId);
    }

    @Test
    void shouldBuscarFluxoPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(flowService.getById(id, tenantId))
                .thenReturn(WhatsappFlowResponse.builder().id(id.toString()).build());

        // Act
        ResponseEntity<WhatsappFlowResponse> response = flowController.getById(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(id.toString());
    }

    @Test
    void shouldCriarFluxo() {
        // Arrange
        CreateWhatsappFlowRequest request = new CreateWhatsappFlowRequest();
        request.setName("Boas-vindas");
        request.setTriggerType("keyword");
        when(flowService.create(tenantId, request))
                .thenReturn(WhatsappFlowResponse.builder().name("Boas-vindas").build());

        // Act
        ResponseEntity<WhatsappFlowResponse> response = flowController.create(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        verify(flowService).create(tenantId, request);
    }

    @Test
    void shouldAtualizarFluxo() {
        // Arrange
        UUID id = UUID.randomUUID();
        CreateWhatsappFlowRequest request = new CreateWhatsappFlowRequest();
        request.setName("Atualizado");
        request.setTriggerType("event");
        when(flowService.update(id, tenantId, request))
                .thenReturn(WhatsappFlowResponse.builder().name("Atualizado").build());

        // Act
        ResponseEntity<WhatsappFlowResponse> response = flowController.update(id, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        verify(flowService).update(id, tenantId, request);
    }

    @Test
    void shouldDeletarFluxo() {
        // Arrange
        UUID id = UUID.randomUUID();

        // Act
        ResponseEntity<Void> response = flowController.delete(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(flowService).delete(id, tenantId);
    }

    @Test
    void shouldDuplicarFluxo() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(flowService.duplicate(id, tenantId))
                .thenReturn(WhatsappFlowResponse.builder().name("Cópia de X").build());

        // Act
        ResponseEntity<WhatsappFlowResponse> response = flowController.duplicate(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Cópia de X");
        verify(flowService).duplicate(id, tenantId);
    }

    @Test
    void shouldValidarEstruturaDoFluxo() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(flowService.validate(id, tenantId))
                .thenReturn(ValidateFlowResponse.builder().valid(true).errors(List.of()).build());

        // Act
        ResponseEntity<ValidateFlowResponse> response = flowController.validate(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isValid()).isTrue();
        verify(flowService).validate(id, tenantId);
    }

    @Test
    void shouldIniciarTesteDoFluxo() {
        // Arrange
        UUID id = UUID.randomUUID();
        TestFlowRequest request = new TestFlowRequest();
        request.setPhone("5511999998888");
        String executionId = UUID.randomUUID().toString();
        when(flowService.test(id, tenantId, request))
                .thenReturn(TestFlowResponse.builder().executionId(executionId).status("started").build());

        // Act
        ResponseEntity<TestFlowResponse> response = flowController.test(id, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getExecutionId()).isEqualTo(executionId);
        assertThat(response.getBody().getStatus()).isEqualTo("started");
        verify(flowService).test(id, tenantId, request);
    }
}
