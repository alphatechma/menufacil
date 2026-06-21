package br.com.menufacil.config.observability.health;

import br.com.menufacil.service.UploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ListBucketsResponse;

/**
 * HealthIndicator do MinIO / S3-compatible storage.
 *
 * <p>Faz uma chamada {@code listBuckets()} para validar conectividade,
 * autenticação e disponibilidade do servico. Falhas marcam o componente
 * como DOWN sem derrubar a app — clientes podem inspecionar via
 * {@code /actuator/health/minio}.</p>
 */
@Slf4j
@Component("minio")
@RequiredArgsConstructor
public class MinioHealthIndicator implements HealthIndicator {

    private final UploadService uploadService;

    @Override
    public Health health() {
        S3Client s3 = uploadService.getS3Client();
        if (s3 == null) {
            return Health.down()
                    .withDetail("error", "S3Client not initialized")
                    .build();
        }

        long start = System.currentTimeMillis();
        try {
            ListBucketsResponse response = s3.listBuckets();
            long elapsed = System.currentTimeMillis() - start;
            return Health.up()
                    .withDetail("buckets", response.buckets().size())
                    .withDetail("latency_ms", elapsed)
                    .build();
        } catch (Exception e) {
            log.warn("MinIO health check falhou: {}", e.getMessage());
            return Health.down()
                    .withDetail("error", e.getClass().getSimpleName())
                    .withDetail("message", e.getMessage())
                    .build();
        }
    }
}
