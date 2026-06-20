package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "floor_plans")
public class FloorPlan extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(name = "unit_id", columnDefinition = "uuid")
    private UUID unitId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "layout", columnDefinition = "jsonb")
    private String layout;
}
