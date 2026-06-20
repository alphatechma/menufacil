package br.com.menufacil.controller;

import br.com.menufacil.dto.UploadResponse;
import br.com.menufacil.service.UploadService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class UploadControllerTest {

    @Mock private UploadService uploadService;

    @InjectMocks
    private UploadController uploadController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldFazerUploadDeImagemComSucesso() {
        // Arrange
        MultipartFile file = new MockMultipartFile(
                "file",
                "foto.png",
                "image/png",
                "conteudo".getBytes()
        );
        UploadResponse expected = UploadResponse.builder()
                .url("http://localhost:9000/menufacil/uploads/abc.png")
                .filename("abc.png")
                .size(file.getSize())
                .build();
        when(uploadService.uploadFile(any(MultipartFile.class))).thenReturn(expected);

        // Act
        ResponseEntity<UploadResponse> response = uploadController.uploadImage(file);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getUrl()).contains("uploads/");
        verify(uploadService).uploadFile(file);
    }

    @Test
    void shouldLancarExcecaoQuandoArquivoForVazio() {
        // Arrange
        MultipartFile file = new MockMultipartFile(
                "file",
                "vazio.png",
                "image/png",
                new byte[0]
        );

        // Act + Assert
        assertThatThrownBy(() -> uploadController.uploadImage(file))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("obrigatório");
        verifyNoInteractions(uploadService);
    }

    @Test
    void shouldLancarExcecaoQuandoArquivoExcederTamanhoMaximo() {
        // Arrange — 6MB file (acima do limite de 5MB)
        byte[] bigContent = new byte[6 * 1024 * 1024];
        MultipartFile file = new MockMultipartFile(
                "file",
                "grande.png",
                "image/png",
                bigContent
        );

        // Act + Assert
        assertThatThrownBy(() -> uploadController.uploadImage(file))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("5MB");
        verifyNoInteractions(uploadService);
    }

    @Test
    void shouldLancarExcecaoQuandoContentTypeForInvalido() {
        // Arrange
        MultipartFile file = new MockMultipartFile(
                "file",
                "documento.pdf",
                "application/pdf",
                "bytes".getBytes()
        );

        // Act + Assert
        assertThatThrownBy(() -> uploadController.uploadImage(file))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Tipo de arquivo inválido");
        verifyNoInteractions(uploadService);
    }
}
