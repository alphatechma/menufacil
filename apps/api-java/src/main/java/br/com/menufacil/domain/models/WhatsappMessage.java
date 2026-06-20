package br.com.menufacil.domain.models;

import br.com.menufacil.domain.enums.WhatsappMessageDirection;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "whatsapp_messages")
public class WhatsappMessage extends BaseEntity {

    @Column(name = "instance_id", columnDefinition = "uuid")
    private UUID instanceId;

    @Column(nullable = false)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WhatsappMessageDirection direction;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "template_used")
    private String templateUsed;

    @Column(nullable = false)
    private boolean delivered = false;
}
