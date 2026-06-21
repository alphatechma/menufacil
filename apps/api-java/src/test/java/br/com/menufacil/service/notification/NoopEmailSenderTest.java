package br.com.menufacil.service.notification;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;

class NoopEmailSenderTest {

    @Test
    void shouldExecutarSemLancarExcecao() {
        NoopEmailSender sender = new NoopEmailSender();
        assertThatCode(() -> sender.send("anyone@example.com", "Assunto", "Corpo"))
                .doesNotThrowAnyException();
    }
}
