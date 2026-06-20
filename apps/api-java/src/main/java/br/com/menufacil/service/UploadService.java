package br.com.menufacil.service;

import br.com.menufacil.dto.UploadResponse;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.net.URI;
import java.util.UUID;

@Slf4j
@Service
public class UploadService {

    private final String endpoint;
    private final int port;
    private final boolean useSsl;
    private final String accessKey;
    private final String secretKey;
    private final String bucket;
    private final String publicUrl;

    private S3Client s3Client;

    public UploadService(
            @Value("${minio.endpoint}") String endpoint,
            @Value("${minio.port:9000}") int port,
            @Value("${minio.use-ssl:false}") boolean useSsl,
            @Value("${minio.access-key}") String accessKey,
            @Value("${minio.secret-key}") String secretKey,
            @Value("${minio.bucket}") String bucket,
            @Value("${minio.public-url}") String publicUrl) {
        this.endpoint = endpoint;
        this.port = port;
        this.useSsl = useSsl;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.bucket = bucket;
        this.publicUrl = publicUrl;
    }

    @PostConstruct
    public void init() {
        String protocol = useSsl ? "https" : "http";
        URI endpointUri = URI.create(protocol + "://" + endpoint + ":" + port);

        this.s3Client = S3Client.builder()
                .endpointOverride(endpointUri)
                .region(Region.US_EAST_1)
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .httpClient(UrlConnectionHttpClient.create())
                .build();

        ensureBucketExists();
    }

    private void ensureBucketExists() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
            log.info("Bucket '{}' já existe", bucket);
        } catch (S3Exception e) {
            try {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
                log.info("Bucket '{}' criado com sucesso", bucket);
            } catch (S3Exception ex) {
                log.warn("Não foi possível criar o bucket MinIO '{}': {}", bucket, ex.getMessage());
            }
        }
    }

    /**
     * Faz upload de um arquivo para o bucket S3/MinIO configurado.
     * O nome do arquivo é gerado via UUID preservando a extensão original.
     */
    public UploadResponse uploadFile(MultipartFile file) {
        String originalName = file.getOriginalFilename();
        String extension = extractExtension(originalName);
        String filename = UUID.randomUUID().toString() + extension;
        String key = "uploads/" + filename;

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));
        } catch (IOException e) {
            log.error("Erro ao ler bytes do arquivo enviado", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Falha ao processar o arquivo enviado");
        } catch (S3Exception e) {
            log.error("Erro ao enviar arquivo para o bucket {}: {}", bucket, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Falha ao enviar o arquivo para o armazenamento");
        }

        String url = publicUrl + "/" + bucket + "/" + key;
        log.info("Arquivo enviado com sucesso: {} ({} bytes)", url, file.getSize());

        return UploadResponse.builder()
                .url(url)
                .filename(filename)
                .size(file.getSize())
                .build();
    }

    private String extractExtension(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        if (dot < 0) {
            return "";
        }
        return filename.substring(dot);
    }

    // Utilizado apenas em testes para injetar S3Client mockado
    void setS3Client(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    S3Client getS3Client() {
        return s3Client;
    }
}
