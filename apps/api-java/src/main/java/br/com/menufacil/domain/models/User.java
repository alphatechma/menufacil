package br.com.menufacil.domain.models;

import br.com.menufacil.domain.enums.UserRole;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "system_role", nullable = false)
    private UserRole systemRole;

    @Column(name = "role_id", columnDefinition = "uuid")
    private UUID roleId;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    private String phone;

    @Column(name = "avatar_url")
    private String avatarUrl;
}
