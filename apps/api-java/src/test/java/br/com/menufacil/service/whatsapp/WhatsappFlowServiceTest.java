package br.com.menufacil.service.whatsapp;

import br.com.menufacil.converter.WhatsappFlowConverter;
import br.com.menufacil.domain.enums.WhatsappFlowTriggerType;
import br.com.menufacil.domain.models.WhatsappFlow;
import br.com.menufacil.domain.models.WhatsappFlowExecution;
import br.com.menufacil.dto.CreateWhatsappFlowRequest;
import br.com.menufacil.dto.TestFlowRequest;
import br.com.menufacil.dto.TestFlowResponse;
import br.com.menufacil.dto.ValidateFlowResponse;
import br.com.menufacil.dto.WhatsappFlowResponse;
import br.com.menufacil.repository.WhatsappFlowExecutionRepository;
import br.com.menufacil.repository.WhatsappFlowRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsappFlowServiceTest {

    @Mock private WhatsappFlowRepository flowRepository;
    @Mock private WhatsappFlowExecutionRepository flowExecutionRepository;
    @Mock private WhatsappFlowConverter flowConverter;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private WhatsappFlowService flowService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        flowService = new WhatsappFlowService(flowRepository, flowExecutionRepository, flowConverter, objectMapper);
    }

    @Test
    void shouldListarFluxosDoTenant() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        WhatsappFlow f1 = new WhatsappFlow();
        WhatsappFlow f2 = new WhatsappFlow();
        when(flowRepository.findByTenantIdOrderByPriorityDescCreatedAtDesc(tenantId))
                .thenReturn(List.of(f1, f2));
        when(flowConverter.toResponse(any()))
                .thenReturn(WhatsappFlowResponse.builder().build());

        // Act
        List<WhatsappFlowResponse> result = flowService.listByTenant(tenantId);

        // Assert
        assertThat(result).hasSize(2);
        verify(flowRepository).findByTenantIdOrderByPriorityDescCreatedAtDesc(tenantId);
    }

    @Test
    void shouldCriarFluxoWhatsapp() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        CreateWhatsappFlowRequest request = new CreateWhatsappFlowRequest();
        request.setName("Boas-vindas");
        request.setTriggerType("keyword");

        WhatsappFlow entity = new WhatsappFlow();
        entity.setName("Boas-vindas");

        WhatsappFlow saved = new WhatsappFlow();
        saved.setId(UUID.randomUUID());
        saved.setName("Boas-vindas");
        saved.setTenantId(tenantId);

        WhatsappFlowResponse response = WhatsappFlowResponse.builder()
                .id(saved.getId().toString()).name("Boas-vindas").build();

        when(flowConverter.toEntity(request)).thenReturn(entity);
        when(flowRepository.save(entity)).thenReturn(saved);
        when(flowConverter.toResponse(saved)).thenReturn(response);

        // Act
        WhatsappFlowResponse result = flowService.create(tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Boas-vindas");
        assertThat(entity.getTenantId()).isEqualTo(tenantId);
        verify(flowRepository).save(entity);
    }

    @Test
    void shouldAtualizarFluxoValidandoTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        WhatsappFlow existing = new WhatsappFlow();
        existing.setId(id);
        existing.setTenantId(tenantId);
        existing.setName("Antigo");

        CreateWhatsappFlowRequest request = new CreateWhatsappFlowRequest();
        request.setName("Novo");
        request.setTriggerType("event");

        when(flowRepository.findById(id)).thenReturn(Optional.of(existing));
        when(flowRepository.save(existing)).thenReturn(existing);
        when(flowConverter.toResponse(existing))
                .thenReturn(WhatsappFlowResponse.builder().name("Novo").build());

        // Act
        WhatsappFlowResponse result = flowService.update(id, tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        verify(flowConverter).updateFromRequest(request, existing);
        verify(flowRepository).save(existing);
    }

    @Test
    void shouldLancarForbiddenAoAtualizarFluxoDeOutroTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID outroTenant = UUID.randomUUID();
        WhatsappFlow existing = new WhatsappFlow();
        existing.setId(id);
        existing.setTenantId(outroTenant);

        CreateWhatsappFlowRequest request = new CreateWhatsappFlowRequest();
        request.setName("Hack");
        request.setTriggerType("keyword");

        when(flowRepository.findById(id)).thenReturn(Optional.of(existing));

        // Act + Assert
        assertThatThrownBy(() -> flowService.update(id, tenantId, request))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldDeletarFluxoValidandoTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        WhatsappFlow entity = new WhatsappFlow();
        entity.setId(id);
        entity.setTenantId(tenantId);

        when(flowRepository.findById(id)).thenReturn(Optional.of(entity));

        // Act
        flowService.delete(id, tenantId);

        // Assert
        verify(flowRepository).delete(entity);
    }

    @Test
    void shouldDuplicarFluxoCriandoCopia() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        WhatsappFlow source = new WhatsappFlow();
        source.setId(id);
        source.setTenantId(tenantId);
        source.setName("Original");
        source.setDescription("desc");
        source.setTriggerType(WhatsappFlowTriggerType.keyword);
        source.setTriggerConfig("{}");
        source.setNodes("[]");
        source.setEdges("[]");
        source.setActive(true);
        source.setPriority(3);

        WhatsappFlow saved = new WhatsappFlow();
        saved.setId(UUID.randomUUID());
        saved.setName("Cópia de Original");

        when(flowRepository.findById(id)).thenReturn(Optional.of(source));
        when(flowRepository.save(any(WhatsappFlow.class))).thenReturn(saved);
        when(flowConverter.toResponse(saved))
                .thenReturn(WhatsappFlowResponse.builder()
                        .id(saved.getId().toString())
                        .name("Cópia de Original")
                        .build());

        // Act
        WhatsappFlowResponse result = flowService.duplicate(id, tenantId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Cópia de Original");
        verify(flowRepository).save(any(WhatsappFlow.class));
    }

    @Test
    void shouldValidarFluxoComEstruturaCorreta() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        WhatsappFlow flow = new WhatsappFlow();
        flow.setId(id);
        flow.setTenantId(tenantId);
        flow.setNodes("[{\"id\":\"n1\",\"type\":\"start\"},{\"id\":\"n2\",\"type\":\"message\"}]");
        flow.setEdges("[{\"source\":\"n1\",\"target\":\"n2\"}]");

        when(flowRepository.findById(id)).thenReturn(Optional.of(flow));

        // Act
        ValidateFlowResponse response = flowService.validate(id, tenantId);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isValid()).isTrue();
        assertThat(response.getErrors()).isEmpty();
    }

    @Test
    void shouldRetornarErrosAoValidarFluxoInvalido() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        WhatsappFlow flow = new WhatsappFlow();
        flow.setId(id);
        flow.setTenantId(tenantId);
        // Sem startNode + edge apontando pra nó inexistente
        flow.setNodes("[{\"id\":\"n1\",\"type\":\"message\"}]");
        flow.setEdges("[{\"source\":\"n1\",\"target\":\"nX\"}]");

        when(flowRepository.findById(id)).thenReturn(Optional.of(flow));

        // Act
        ValidateFlowResponse response = flowService.validate(id, tenantId);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isValid()).isFalse();
        assertThat(response.getErrors()).isNotEmpty();
        assertThat(response.getErrors()).anyMatch(e -> e.contains("início"));
        assertThat(response.getErrors()).anyMatch(e -> e.contains("destino"));
    }

    @Test
    void shouldIniciarExecucaoDeTesteDoFluxo() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        WhatsappFlow flow = new WhatsappFlow();
        flow.setId(id);
        flow.setTenantId(tenantId);

        TestFlowRequest request = new TestFlowRequest();
        request.setPhone("5511999998888");

        WhatsappFlowExecution saved = new WhatsappFlowExecution();
        saved.setId(UUID.randomUUID());

        when(flowRepository.findById(id)).thenReturn(Optional.of(flow));
        when(flowExecutionRepository.save(any(WhatsappFlowExecution.class))).thenReturn(saved);

        // Act
        TestFlowResponse response = flowService.test(id, tenantId, request);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getExecutionId()).isEqualTo(saved.getId().toString());
        assertThat(response.getStatus()).isEqualTo("started");
        verify(flowExecutionRepository).save(any(WhatsappFlowExecution.class));
    }
}
