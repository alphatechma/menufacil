-- =====================================================================
-- V4__seed_permissions_and_default_roles.sql
--
-- Seed dos modulos do sistema, permissoes granulares (36 = 9 modulos x
-- 4 acoes) e funcao plpgsql que cria os 4 cargos default (Manager,
-- Cashier, Kitchen, Waiter) para um tenant especifico.
--
-- DEPENDE: V3 cria as tabelas permissions, roles, role_permissions e
-- system_modules.
--
-- A funcao create_default_roles_for_tenant(p_tenant_id) nao eh chamada
-- nesta migration; deve ser invocada pelo seeder de novo tenant.
-- =====================================================================

-- Necessario para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- PASSO 1 — Seed dos 9 SystemModules
-- =====================================================================
INSERT INTO system_modules (id, key, name, description, version, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'product',  'Produto',    'Modulo de produtos do cardapio', 0, NOW(), NOW()),
    (gen_random_uuid(), 'category', 'Categoria',  'Modulo de categorias',           0, NOW(), NOW()),
    (gen_random_uuid(), 'order',    'Pedido',     'Modulo de pedidos',              0, NOW(), NOW()),
    (gen_random_uuid(), 'customer', 'Cliente',    'Modulo de clientes',             0, NOW(), NOW()),
    (gen_random_uuid(), 'delivery', 'Delivery',   'Modulo de entrega',              0, NOW(), NOW()),
    (gen_random_uuid(), 'coupon',   'Cupom',      'Modulo de cupons',               0, NOW(), NOW()),
    (gen_random_uuid(), 'loyalty',  'Fidelidade', 'Modulo de fidelidade e pontos',  0, NOW(), NOW()),
    (gen_random_uuid(), 'kds',      'KDS',        'Kitchen display system',         0, NOW(), NOW()),
    (gen_random_uuid(), 'report',   'Relatorios', 'Relatorios e analytics',         0, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
-- PASSO 2 — Seed das 36 Permissions (9 modulos x 4 acoes)
-- Formato da key: "<modulo>:<acao>"
-- Nome humano: "Criar/Ler/Atualizar/Remover <Nome do Modulo>"
-- =====================================================================
WITH modules AS (
    SELECT id, key, name FROM system_modules
    WHERE key IN ('product', 'category', 'order', 'customer', 'delivery',
                  'coupon', 'loyalty', 'kds', 'report')
),
actions(action, action_pt) AS (
    VALUES
        ('create', 'Criar'),
        ('read',   'Ler'),
        ('update', 'Atualizar'),
        ('delete', 'Remover')
)
INSERT INTO permissions (id, key, name, module_id, version, created_at, updated_at)
SELECT
    gen_random_uuid(),
    m.key || ':' || a.action,
    a.action_pt || ' ' || m.name,
    m.id,
    0,
    NOW(),
    NOW()
FROM modules m
CROSS JOIN actions a
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
-- PASSO 3 — Funcao create_default_roles_for_tenant
--
-- Cria os 4 cargos default (Manager, Cashier, Kitchen, Waiter) para o
-- tenant informado, ja com as permissoes associadas.
--
-- Idempotente: usa ON CONFLICT DO NOTHING quando possivel; se a role
-- ja existir (mesmo tenant + mesmo nome + is_system_default=true), pula.
-- =====================================================================
CREATE OR REPLACE FUNCTION create_default_roles_for_tenant(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_manager_id  UUID;
    v_cashier_id  UUID;
    v_kitchen_id  UUID;
    v_waiter_id   UUID;
BEGIN
    -- -----------------------------------------------------------------
    -- Role: Manager
    -- Permissoes: TODAS exceto product:delete e category:delete
    -- -----------------------------------------------------------------
    SELECT id INTO v_manager_id
    FROM roles
    WHERE tenant_id = p_tenant_id
      AND name = 'Manager'
      AND is_system_default = TRUE
    LIMIT 1;

    IF v_manager_id IS NULL THEN
        v_manager_id := gen_random_uuid();
        INSERT INTO roles (id, tenant_id, name, description, is_system_default,
                           version, created_at, updated_at)
        VALUES (v_manager_id, p_tenant_id, 'Manager',
                'Gerencia operacao da unidade', TRUE, 0, NOW(), NOW());

        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_manager_id, p.id
        FROM permissions p
        WHERE p.key NOT IN ('product:delete', 'category:delete')
        ON CONFLICT DO NOTHING;
    END IF;

    -- -----------------------------------------------------------------
    -- Role: Cashier
    -- Permissoes: order:read, order:create, order:update, customer:read, coupon:read
    -- -----------------------------------------------------------------
    SELECT id INTO v_cashier_id
    FROM roles
    WHERE tenant_id = p_tenant_id
      AND name = 'Cashier'
      AND is_system_default = TRUE
    LIMIT 1;

    IF v_cashier_id IS NULL THEN
        v_cashier_id := gen_random_uuid();
        INSERT INTO roles (id, tenant_id, name, description, is_system_default,
                           version, created_at, updated_at)
        VALUES (v_cashier_id, p_tenant_id, 'Cashier',
                'Operador de caixa', TRUE, 0, NOW(), NOW());

        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_cashier_id, p.id
        FROM permissions p
        WHERE p.key IN ('order:read', 'order:create', 'order:update',
                        'customer:read', 'coupon:read')
        ON CONFLICT DO NOTHING;
    END IF;

    -- -----------------------------------------------------------------
    -- Role: Kitchen
    -- Permissoes: order:read, order:update, kds:read, kds:update
    -- -----------------------------------------------------------------
    SELECT id INTO v_kitchen_id
    FROM roles
    WHERE tenant_id = p_tenant_id
      AND name = 'Kitchen'
      AND is_system_default = TRUE
    LIMIT 1;

    IF v_kitchen_id IS NULL THEN
        v_kitchen_id := gen_random_uuid();
        INSERT INTO roles (id, tenant_id, name, description, is_system_default,
                           version, created_at, updated_at)
        VALUES (v_kitchen_id, p_tenant_id, 'Kitchen',
                'Cozinha/KDS', TRUE, 0, NOW(), NOW());

        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_kitchen_id, p.id
        FROM permissions p
        WHERE p.key IN ('order:read', 'order:update',
                        'kds:read', 'kds:update')
        ON CONFLICT DO NOTHING;
    END IF;

    -- -----------------------------------------------------------------
    -- Role: Waiter
    -- Permissoes: order:create, order:read, order:update,
    --             customer:read, product:read, category:read
    -- -----------------------------------------------------------------
    SELECT id INTO v_waiter_id
    FROM roles
    WHERE tenant_id = p_tenant_id
      AND name = 'Waiter'
      AND is_system_default = TRUE
    LIMIT 1;

    IF v_waiter_id IS NULL THEN
        v_waiter_id := gen_random_uuid();
        INSERT INTO roles (id, tenant_id, name, description, is_system_default,
                           version, created_at, updated_at)
        VALUES (v_waiter_id, p_tenant_id, 'Waiter',
                'Garcom', TRUE, 0, NOW(), NOW());

        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_waiter_id, p.id
        FROM permissions p
        WHERE p.key IN ('order:create', 'order:read', 'order:update',
                        'customer:read', 'product:read', 'category:read')
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

COMMENT ON FUNCTION create_default_roles_for_tenant(UUID) IS
'Cria os 4 cargos default (Manager, Cashier, Kitchen, Waiter) com permissoes para o tenant informado. Idempotente.';
