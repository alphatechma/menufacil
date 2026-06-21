package br.com.menufacil.config.observability.health;

import br.com.menufacil.service.UploadService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Bucket;
import software.amazon.awssdk.services.s3.model.ListBucketsResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

class MinioHealthIndicatorTest {

    @Mock private UploadService uploadService;
    @Mock private S3Client s3Client;

    private MinioHealthIndicator indicator;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        indicator = new MinioHealthIndicator(uploadService);
    }

    @Test
    void deveRetornarUpQuandoListBucketsResponde() {
        when(uploadService.getS3Client()).thenReturn(s3Client);
        when(s3Client.listBuckets()).thenReturn(
                ListBucketsResponse.builder()
                        .buckets(List.of(Bucket.builder().name("menufacil").build()))
                        .build());

        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.UP);
        assertThat(health.getDetails()).containsKey("buckets");
        assertThat(health.getDetails()).containsKey("latency_ms");
    }

    @Test
    void deveRetornarDownQuandoListBucketsLancaExcecao() {
        when(uploadService.getS3Client()).thenReturn(s3Client);
        when(s3Client.listBuckets())
                .thenThrow(S3Exception.builder().message("connection refused").build());

        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertThat(health.getDetails()).containsKey("error");
        assertThat(health.getDetails()).containsKey("message");
    }

    @Test
    void deveRetornarDownQuandoS3ClientNaoInicializado() {
        when(uploadService.getS3Client()).thenReturn(null);

        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertThat(health.getDetails()).containsEntry("error", "S3Client not initialized");
    }
}
