-- =============================================================================
-- V3 - Create new module tables (Spring/JPA migration)
-- =============================================================================
-- Purpose:
--   Cria as tabelas das entidades NOVAS introduzidas na migracao TypeORM -> Spring.
--   As tabelas legadas (tenants, users, categories, products, orders, customers,
--   coupons, etc.) ja existem do TypeORM e NAO sao recriadas aqui.
--
-- Convencoes herdadas de BaseEntity:
--   - id          UUID PK default gen_random_uuid()
--   - tenant_id   UUID NULL  (NULL em entidades globais: system_modules,
--                             permissions, plans; pode ser NULL tambem em
--                             audit_logs quando acao e do super-admin)
--   - version     BIGINT     (optimistic locking)
--   - created_at  TIMESTAMP NOT NULL DEFAULT NOW()
--   - updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
--   - deleted_at  TIMESTAMP NULL (soft delete)
--
-- Tipos:
--   - @Enumerated(EnumType.STRING) -> VARCHAR
--   - @JdbcTypeCode(SqlTypes.JSON) -> JSONB
--   - BigDecimal price/amount      -> NUMERIC(10,2)
--   - Texto longo (qr_code, content, pix_*) -> TEXT
--
-- Indexes:
--   - tenant_id em todas as tabelas multi-tenant (queries filtradas por tenant)
--   - Campos de busca frequente (status, phone, instance_name, etc.)
-- =============================================================================

-- Garante que gen_random_uuid() esta disponivel
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- -----------------------------------------------------------------------------
-- 1. system_modules (GLOBAL - tenant_id sempre NULL)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_modules (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NULL,
    version     BIGINT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMP NULL,

    key         VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    description VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_system_modules_key ON system_modules(key);


-- -----------------------------------------------------------------------------
-- 2. permissions (GLOBAL - tenant_id sempre NULL)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NULL,
    version     BIGINT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMP NULL,

    key         VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    module_id   UUID NULL,

    CONSTRAINT fk_permissions_module
        FOREIGN KEY (module_id) REFERENCES system_modules(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_permissions_key ON permissions(key);
CREATE INDEX IF NOT EXISTS idx_permissions_module_id ON permissions(module_id);


-- -----------------------------------------------------------------------------
-- 3. roles (multi-tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NULL,
    version           BIGINT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMP NULL,

    name              VARCHAR(255) NOT NULL,
    description       VARCHAR(255),
    is_system_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id);


-- -----------------------------------------------------------------------------
-- 4. role_permissions (junction Role <-> Permission)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       UUID NOT NULL,
    permission_id UUID NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);


-- -----------------------------------------------------------------------------
-- 5. tenant_units (multi-tenant + UK por tenant_id + slug)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_units (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NULL,
    version         BIGINT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP NULL,

    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    address         VARCHAR(255),
    phone           VARCHAR(255),
    business_hours  JSONB,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
    order_modes     JSONB,

    CONSTRAINT uk_tenant_units_tenant_slug UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_tenant_units_tenant_id ON tenant_units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_units_slug ON tenant_units(slug);


-- -----------------------------------------------------------------------------
-- 6. plans (GLOBAL - tenant_id sempre NULL)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NULL,
    version      BIGINT,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMP NULL,

    name         VARCHAR(255) NOT NULL,
    price        NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_users    INTEGER,
    max_products INTEGER,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE
);


-- -----------------------------------------------------------------------------
-- 7. plan_modules (junction Plan <-> SystemModule)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_modules (
    plan_id   UUID NOT NULL,
    module_id UUID NOT NULL,

    PRIMARY KEY (plan_id, module_id),

    CONSTRAINT fk_plan_modules_plan
        FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_plan_modules_module
        FOREIGN KEY (module_id) REFERENCES system_modules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plan_modules_plan_id ON plan_modules(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_modules_module_id ON plan_modules(module_id);


-- -----------------------------------------------------------------------------
-- 8. floor_plans (multi-tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS floor_plans (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NULL,
    version    BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,

    name       VARCHAR(255) NOT NULL,
    unit_id    UUID,
    layout     JSONB
);

CREATE INDEX IF NOT EXISTS idx_floor_plans_tenant_id ON floor_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_floor_plans_unit_id ON floor_plans(unit_id);


-- -----------------------------------------------------------------------------
-- 9. audit_logs (tenant_id pode ser NULL para acoes de super-admin)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NULL,
    version     BIGINT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMP NULL,

    user_id     UUID,
    user_email  VARCHAR(255) NOT NULL,
    action      VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    entity_id   UUID,
    entity_name VARCHAR(255),
    details     JSONB,
    ip_address  VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);


-- -----------------------------------------------------------------------------
-- 10. abandoned_carts (multi-tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS abandoned_carts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NULL,
    version           BIGINT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMP NULL,

    customer_id       UUID NOT NULL,
    items             JSONB NOT NULL,
    total             NUMERIC(10,2) NOT NULL DEFAULT 0,
    recovered         BOOLEAN NOT NULL DEFAULT FALSE,
    recovered_at      TIMESTAMP,
    notification_sent BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_abandoned_carts_tenant_id ON abandoned_carts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_customer_id ON abandoned_carts(customer_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_carts_recovered ON abandoned_carts(recovered);


-- -----------------------------------------------------------------------------
-- 11. referrals (multi-tenant; code globalmente unico)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NULL,
    version        BIGINT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMP NULL,

    referrer_id    UUID NOT NULL,
    referred_id    UUID,
    code           VARCHAR(8) NOT NULL UNIQUE,
    reward_given   BOOLEAN NOT NULL DEFAULT FALSE,
    points_awarded INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_referrals_tenant_id ON referrals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);


-- -----------------------------------------------------------------------------
-- 12. notifications (multi-tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NULL,
    version    BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,

    order_id   UUID,
    channel    VARCHAR(50) NOT NULL,
    status     VARCHAR(50) NOT NULL DEFAULT 'pending',
    sent_at    TIMESTAMP,
    recipient  VARCHAR(255) NOT NULL,
    content    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);


-- -----------------------------------------------------------------------------
-- 13. payment_transactions (multi-tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_transactions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NULL,
    version        BIGINT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMP NULL,

    order_id       UUID,
    method         VARCHAR(50) NOT NULL,
    external_id    VARCHAR(255),
    status         VARCHAR(50) NOT NULL DEFAULT 'pending',
    amount         NUMERIC(10,2) NOT NULL,
    pix_qr_code    TEXT,
    pix_copy_paste TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant_id ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_external_id ON payment_transactions(external_id);


-- -----------------------------------------------------------------------------
-- 14. whatsapp_instances (multi-tenant; instance_name globalmente unico)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_instances (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NULL,
    version       BIGINT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMP NULL,

    unit_id       UUID,
    instance_name VARCHAR(255) NOT NULL UNIQUE,
    status        VARCHAR(50) NOT NULL DEFAULT 'disconnected',
    phone_number  VARCHAR(255),
    qr_code       TEXT
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_tenant_id ON whatsapp_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_unit_id ON whatsapp_instances(unit_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_instance_name ON whatsapp_instances(instance_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);


-- -----------------------------------------------------------------------------
-- 15. whatsapp_templates (multi-tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NULL,
    version          BIGINT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMP NULL,

    name             VARCHAR(255) NOT NULL,
    template_content TEXT,
    variables        JSONB
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant_id ON whatsapp_templates(tenant_id);


-- -----------------------------------------------------------------------------
-- 16. whatsapp_messages (multi-tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NULL,
    version       BIGINT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at    TIMESTAMP NULL,

    instance_id   UUID,
    phone         VARCHAR(255) NOT NULL,
    direction     VARCHAR(50) NOT NULL,
    content       TEXT,
    template_used VARCHAR(255),
    delivered     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_id ON whatsapp_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance_id ON whatsapp_messages(instance_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON whatsapp_messages(direction);


-- -----------------------------------------------------------------------------
-- 17. whatsapp_flows (multi-tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_flows (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID NULL,
    version        BIGINT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMP NULL,

    name           VARCHAR(255) NOT NULL,
    description    VARCHAR(255),
    trigger_type   VARCHAR(50) NOT NULL,
    trigger_config JSONB,
    nodes          JSONB,
    edges          JSONB,
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    priority       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_flows_tenant_id ON whatsapp_flows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flows_trigger_type ON whatsapp_flows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flows_active ON whatsapp_flows(active);


-- -----------------------------------------------------------------------------
-- 18. whatsapp_flow_executions (multi-tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_flow_executions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NULL,
    version         BIGINT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP NULL,

    flow_id         UUID,
    phone           VARCHAR(255) NOT NULL,
    execution_state JSONB,
    current_node_id VARCHAR(255),
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    started_at      TIMESTAMP NOT NULL,
    ended_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_executions_tenant_id ON whatsapp_flow_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_executions_flow_id ON whatsapp_flow_executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_executions_phone ON whatsapp_flow_executions(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_executions_active ON whatsapp_flow_executions(active);
