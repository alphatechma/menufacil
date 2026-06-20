package br.com.menufacil.domain.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(name = "whatsapp_templates")
public class WhatsappMessageTemplate extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "template_content", columnDefinition = "TEXT")
    private String templateContent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "variables", columnDefinition = "jsonb")
    private String variables;
}
