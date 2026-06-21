package br.com.menufacil.service.notification;

/**
 * Abstração para envio de emails.
 *
 * Implementações disponíveis:
 *  - {@link SesEmailSender}: envio real via Amazon SES (ativado por aws.ses.enabled=true)
 *  - {@link NoopEmailSender}: stub que apenas loga (default em dev/test)
 */
public interface EmailSender {

    /**
     * Envia um email síncrono.
     *
     * @param to      destinatário (email válido)
     * @param subject assunto
     * @param body    corpo do email (texto puro)
     */
    void send(String to, String subject, String body);
}
