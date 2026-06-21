package br.com.menufacil.service.notification;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sesv2.SesV2Client;
import software.amazon.awssdk.services.sesv2.model.Body;
import software.amazon.awssdk.services.sesv2.model.Content;
import software.amazon.awssdk.services.sesv2.model.Destination;
import software.amazon.awssdk.services.sesv2.model.EmailContent;
import software.amazon.awssdk.services.sesv2.model.Message;
import software.amazon.awssdk.services.sesv2.model.SendEmailRequest;
import software.amazon.awssdk.services.sesv2.model.SendEmailResponse;

/**
 * Implementação de {@link EmailSender} usando Amazon SES (v2 API).
 *
 * Ativada quando aws.ses.enabled=true. Credenciais estáticas via @Value;
 * em produção, configurar AWS_SES_ACCESS_KEY / AWS_SES_SECRET_KEY como secrets.
 */
@Slf4j
@Service
@ConditionalOnProperty(value = "aws.ses.enabled", havingValue = "true")
public class SesEmailSender implements EmailSender {

    @Value("${aws.ses.region}")
    private String region;

    @Value("${aws.ses.access-key}")
    private String accessKey;

    @Value("${aws.ses.secret-key}")
    private String secretKey;

    @Value("${aws.ses.from-email}")
    private String fromEmail;

    private SesV2Client sesClient;

    @PostConstruct
    void init() {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
        this.sesClient = SesV2Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .build();
        log.info("SesEmailSender inicializado (region={}, from={})", region, fromEmail);
    }

    @PreDestroy
    void close() {
        if (sesClient != null) {
            sesClient.close();
        }
    }

    @Override
    public void send(String to, String subject, String body) {
        try {
            Destination destination = Destination.builder()
                    .toAddresses(to)
                    .build();

            Content subjectContent = Content.builder()
                    .data(subject)
                    .charset("UTF-8")
                    .build();

            Content bodyContent = Content.builder()
                    .data(body)
                    .charset("UTF-8")
                    .build();

            Body emailBody = Body.builder()
                    .text(bodyContent)
                    .build();

            Message message = Message.builder()
                    .subject(subjectContent)
                    .body(emailBody)
                    .build();

            EmailContent content = EmailContent.builder()
                    .simple(message)
                    .build();

            SendEmailRequest request = SendEmailRequest.builder()
                    .fromEmailAddress(fromEmail)
                    .destination(destination)
                    .content(content)
                    .build();

            SendEmailResponse response = sesClient.sendEmail(request);
            log.info("Email enviado via SES: to={}, subject={}, messageId={}",
                    to, subject, response.messageId());
        } catch (RuntimeException e) {
            log.error("Falha ao enviar email via SES: to={}, subject={}, error={}",
                    to, subject, e.getMessage(), e);
            throw e;
        }
    }
}
