package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Entidade global (sem tenant_id) que representa uma permissão concedível a um cargo.
 * Exemplos: product:create, order:read, customer:update.
 *
 * NOTA: Herda de BaseEntity mas tenant_id ficará sempre nulo.
 */
@Getter
@Setter
@Entity
@Table(name = "permissions")
public class Permission extends BaseEntity {

    @Column(unique = true, nullable = false)
    private String key;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id")
    private SystemModule module;
}
