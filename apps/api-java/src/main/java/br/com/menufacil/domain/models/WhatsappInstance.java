package br.com.menufacil.domain.models;

import br.com.menufacil.domain.enums.WhatsappInstanceStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "whatsapp_instances")
public class WhatsappInstance extends BaseEntity {

    @Column(name = "unit_id", columnDefinition = "uuid")
    private UUID unitId;

    @Column(name = "instance_name", nullable = false, unique = true)
    private String instanceName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WhatsappInstanceStatus status = WhatsappInstanceStatus.disconnected;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "qr_code", columnDefinition = "TEXT")
    private String qrCode;
}
