package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

/**
 * Entidade global (sem tenant_id) que representa um plano de assinatura.
 * Cada plano agrupa um conjunto de módulos do sistema disponíveis para tenants.
 *
 * NOTA: Apesar de herdar de BaseEntity (que possui tenant_id), o campo tenant_id
 * será sempre nulo nesta entidade pois trata-se de um recurso global do super-admin.
 */
@Getter
@Setter
@Entity
@Table(name = "plans")
public class Plan extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price = BigDecimal.ZERO;

    @Column(name = "max_users")
    private Integer maxUsers;

    @Column(name = "max_products")
    private Integer maxProducts;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "plan_modules",
            joinColumns = @JoinColumn(name = "plan_id"),
            inverseJoinColumns = @JoinColumn(name = "module_id")
    )
    private Set<SystemModule> modules = new HashSet<>();
}
