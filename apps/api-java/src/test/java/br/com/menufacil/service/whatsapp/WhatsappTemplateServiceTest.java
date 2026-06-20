package br.com.menufacil.service.whatsapp;

import br.com.menufacil.converter.WhatsappTemplateConverter;
import br.com.menufacil.domain.models.WhatsappMessageTemplate;
import br.com.menufacil.dto.CreateWhatsappTemplateRequest;
import br.com.menufacil.dto.WhatsappTemplateResponse;
import br.com.menufacil.repository.WhatsappMessageTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsappTemplateServiceTest {

    @Mock private WhatsappMessageTemplateRepository templateRepository;
    @Mock private WhatsappTemplateConverter templateConverter;

    @InjectMocks
    private WhatsappTemplateService templateService;

    private UUID tenantId;
    private UUID otherTenantId;
    private UUID templateId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        tenantId = UUID.randomUUID();
        otherTenantId = UUID.randomUUID();
        templateId = UUID.randomUUID();
    }

    @Test
    void shouldListarTemplatesDoTenant() {
        // Arrange
        WhatsappMessageTemplate t1 = new WhatsappMessageTemplate();
        WhatsappMessageTemplate t2 = new WhatsappMessageTemplate();
        when(templateRepository.findByTenantIdOrderByNameAsc(tenantId)).thenReturn(List.of(t1, t2));
        when(templateConverter.toResponse(any())).thenReturn(WhatsappTemplateResponse.builder().build());

        // Act
        List<WhatsappTemplateResponse> result = templateService.listByTenant(tenantId);

        // Assert
        assertThat(result).hasSize(2);
        verify(templateRepository).findByTenantIdOrderByNameAsc(tenantId);
    }

    @Test
    void shouldBuscarTemplatePorId() {
        // Arrange
        WhatsappMessageTemplate entity = new WhatsappMessageTemplate();
        entity.setTenantId(tenantId);
        entity.setName("Boas-vindas");
        WhatsappTemplateResponse response = WhatsappTemplateResponse.builder().name("Boas-vindas").build();

        when(templateRepository.findById(templateId)).thenReturn(Optional.of(entity));
        when(templateConverter.toResponse(entity)).thenReturn(response);

        // Act
        WhatsappTemplateResponse result = templateService.getById(templateId, tenantId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Boas-vindas");
    }

    @Test
    void shouldLancarExcecaoQuandoBuscarTemplateInexistente() {
        // Arrange
        when(templateRepository.findById(templateId)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> templateService.getById(templateId, tenantId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Template não encontrado");
    }

    @Test
    void shouldCriarTemplate() {
        // Arrange
        CreateWhatsappTemplateRequest request = new CreateWhatsappTemplateRequest();
        request.setName("Novo");
        request.setTemplateContent("Conteudo");

        WhatsappMessageTemplate entity = new WhatsappMessageTemplate();
        WhatsappMessageTemplate saved = new WhatsappMessageTemplate();
        saved.setId(templateId);
        saved.setTenantId(tenantId);
        saved.setName("Novo");
        WhatsappTemplateResponse response = WhatsappTemplateResponse.builder().name("Novo").build();

        when(templateConverter.toEntity(request)).thenReturn(entity);
        when(templateRepository.save(entity)).thenReturn(saved);
        when(templateConverter.toResponse(saved)).thenReturn(response);

        // Act
        WhatsappTemplateResponse result = templateService.create(tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Novo");
        assertThat(entity.getTenantId()).isEqualTo(tenantId);
        verify(templateRepository).save(entity);
    }

    @Test
    void shouldAtualizarTemplate() {
        // Arrange
        CreateWhatsappTemplateRequest request = new CreateWhatsappTemplateRequest();
        request.setName("Atualizado");
        request.setTemplateContent("Novo conteudo");

        WhatsappMessageTemplate existing = new WhatsappMessageTemplate();
        existing.setId(templateId);
        existing.setTenantId(tenantId);
        existing.setName("Antigo");

        when(templateRepository.findById(templateId)).thenReturn(Optional.of(existing));
        when(templateRepository.save(existing)).thenReturn(existing);
        when(templateConverter.toResponse(existing)).thenReturn(WhatsappTemplateResponse.builder().build());

        // Act
        WhatsappTemplateResponse result = templateService.update(templateId, tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        verify(templateConverter).updateFromRequest(request, existing);
        verify(templateRepository).save(existing);
    }

    @Test
    void shouldLancarExcecaoAoAtualizarDeOutroTenant() {
        // Arrange
        CreateWhatsappTemplateRequest request = new CreateWhatsappTemplateRequest();
        request.setName("Hack");
        request.setTemplateContent("Tentativa");

        WhatsappMessageTemplate existing = new WhatsappMessageTemplate();
        existing.setId(templateId);
        existing.setTenantId(otherTenantId);

        when(templateRepository.findById(templateId)).thenReturn(Optional.of(existing));

        // Act + Assert
        assertThatThrownBy(() -> templateService.update(templateId, tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Acesso negado");

        verify(templateRepository, never()).save(any());
    }

    @Test
    void shouldDeletarTemplate() {
        // Arrange
        WhatsappMessageTemplate existing = new WhatsappMessageTemplate();
        existing.setId(templateId);
        existing.setTenantId(tenantId);

        when(templateRepository.findById(templateId)).thenReturn(Optional.of(existing));

        // Act
        templateService.delete(templateId, tenantId);

        // Assert
        verify(templateRepository).delete(existing);
    }
}
