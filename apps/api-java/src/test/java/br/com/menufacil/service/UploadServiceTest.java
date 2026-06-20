package br.com.menufacil.service;

import br.com.menufacil.dto.UploadResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UploadServiceTest {

    private S3Client s3Client;
    private UploadService uploadService;

    @BeforeEach
    void setUp() {
        s3Client = mock(S3Client.class);
        uploadService = new UploadService(
                "localhost",
                9000,
                false,
                "menufacil",
                "menufacil123",
                "menufacil",
                "http://localhost:9000"
        );
        uploadService.setS3Client(s3Client);
    }

    @Test
    void shouldFazerUploadDeArquivoComSucesso() {
        // Arrange
        MultipartFile file = new MockMultipartFile(
                "file",
                "foto.png",
                "image/png",
                "conteudo-binario".getBytes()
        );
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        // Act
        UploadResponse response = uploadService.uploadFile(file);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getUrl()).startsWith("http://localhost:9000/menufacil/uploads/");
        assertThat(response.getUrl()).endsWith(".png");
        assertThat(response.getFilename()).endsWith(".png");
        assertThat(response.getSize()).isEqualTo(file.getSize());
        verify(s3Client).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void shouldGerarNomeUuidPreservandoExtensao() {
        // Arrange
        MultipartFile file = new MockMultipartFile(
                "file",
                "imagem.webp",
                "image/webp",
                new byte[]{1, 2, 3}
        );
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        // Act
        UploadResponse response = uploadService.uploadFile(file);

        // Assert
        assertThat(response.getFilename()).matches("[0-9a-f-]{36}\\.webp");
    }

    @Test
    void shouldEnviarParaBucketCorretoComKeyUploadsPrefix() {
        // Arrange
        MultipartFile file = new MockMultipartFile(
                "file",
                "foto.jpg",
                "image/jpeg",
                "bytes".getBytes()
        );
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        ArgumentCaptor<PutObjectRequest> captor = ArgumentCaptor.forClass(PutObjectRequest.class);

        // Act
        uploadService.uploadFile(file);

        // Assert
        verify(s3Client).putObject(captor.capture(), any(RequestBody.class));
        PutObjectRequest captured = captor.getValue();
        assertThat(captured.bucket()).isEqualTo("menufacil");
        assertThat(captured.key()).startsWith("uploads/");
        assertThat(captured.key()).endsWith(".jpg");
        assertThat(captured.contentType()).isEqualTo("image/jpeg");
    }

    @Test
    void shouldLancarExcecaoQuandoS3Falha() {
        // Arrange
        MultipartFile file = new MockMultipartFile(
                "file",
                "foto.png",
                "image/png",
                "bytes".getBytes()
        );
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(S3Exception.builder().message("conexão recusada").build());

        // Act + Assert
        assertThatThrownBy(() -> uploadService.uploadFile(file))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Falha ao enviar");
    }

    @Test
    void shouldGerarNomeSemExtensaoQuandoArquivoNaoTiverExtensao() {
        // Arrange
        MultipartFile file = new MockMultipartFile(
                "file",
                "semExtensao",
                "image/png",
                "bytes".getBytes()
        );
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        // Act
        UploadResponse response = uploadService.uploadFile(file);

        // Assert
        assertThat(response.getFilename()).matches("[0-9a-f-]{36}");
    }
}
