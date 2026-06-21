package br.com.menufacil.service.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

/**
 * Implementação stub de {@link EmailSender} para ambientes sem SES configurado
 * (dev local, testes, ou produção com AWS_SES_ENABLED=false).
 *
 * Apenas loga a tentativa de envio — não dispara email real.
 */
@Slf4j
@Service
@ConditionalOnMissingBean(EmailSender.class)
public class NoopEmailSender implements EmailSender {

    @Override
    public void send(String to, String subject, String body) {
        log.info("EMAIL [stub] to={} subject={}", to, subject);
    }
}
