package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Entidade global (sem tenant_id) que representa um módulo do sistema.
 * Exemplos: kds, delivery, loyalty, kitchen.
 *
 * NOTA: Apesar de herdar de BaseEntity (que possui tenant_id), o campo tenant_id
 * será sempre nulo nesta entidade pois trata-se de um recurso global do super-admin.
 */
@Getter
@Setter
@Entity
@Table(name = "system_modules")
public class SystemModule extends BaseEntity {

    @Column(unique = true, nullable = false)
    private String key;

    @Column(nullable = false)
    private String name;

    private String description;
}
