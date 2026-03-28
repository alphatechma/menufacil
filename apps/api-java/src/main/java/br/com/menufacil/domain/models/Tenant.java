package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "tenants")
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "banner_url")
    private String bannerUrl;

    @Column(name = "primary_color")
    private String primaryColor;

    @Column(name = "secondary_color")
    private String secondaryColor;

    @Column(name = "accent_color")
    private String accentColor;

    private String phone;
    private String address;

    @Column(name = "business_hours", columnDefinition = "jsonb")
    private String businessHours;

    @Column(name = "min_order_value")
    private BigDecimal minOrderValue;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "plan_id", columnDefinition = "uuid")
    private UUID planId;

    @Column(name = "notification_settings", columnDefinition = "jsonb")
    private String notificationSettings;

    @Column(name = "order_modes", columnDefinition = "jsonb")
    private String orderModes;

    @Column(name = "payment_config", columnDefinition = "jsonb")
    private String paymentConfig;

    @Column(name = "cancel_time_limit")
    private Integer cancelTimeLimit;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
