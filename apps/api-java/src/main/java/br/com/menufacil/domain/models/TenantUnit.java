package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(
        name = "tenant_units",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_tenant_units_tenant_slug",
                columnNames = {"tenant_id", "slug"}
        )
)
public class TenantUnit extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String slug;

    private String address;

    private String phone;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "business_hours", columnDefinition = "jsonb")
    private String businessHours;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "is_headquarters", nullable = false)
    private boolean isHeadquarters = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "order_modes", columnDefinition = "jsonb")
    private String orderModes;
}
