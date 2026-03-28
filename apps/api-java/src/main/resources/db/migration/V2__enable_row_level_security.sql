-- Row-Level Security (RLS) para isolamento de tenant no PostgreSQL
-- Garante que mesmo com queries sem filtro, o banco não retorna dados de outros tenants

-- Tabelas multi-tenant que precisam de RLS
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'orders', 'order_items', 'products', 'categories', 'customers',
            'customer_addresses', 'delivery_persons', 'delivery_zones',
            'coupons', 'loyalty_rewards', 'loyalty_redemptions',
            'inventory_items', 'stock_movements', 'product_recipes',
            'restaurant_tables', 'table_sessions', 'reservations',
            'wallets', 'wallet_transactions', 'promotions',
            'reviews', 'referrals', 'abandoned_carts',
            'notifications', 'cash_registers', 'users', 'roles',
            'extra_groups', 'extras', 'product_variations',
            'whatsapp_instances', 'whatsapp_messages',
            'whatsapp_message_templates', 'whatsapp_flows',
            'whatsapp_flow_executions', 'loyalty_tiers',
            'floor_plans', 'tenant_units', 'audit_logs',
            'payment_transactions'
        ])
    LOOP
        -- Verificar se a tabela existe antes de aplicar RLS
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl) THEN
            -- Habilitar RLS na tabela
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

            -- Forçar RLS mesmo para o dono da tabela
            EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

            -- Remover policy existente se houver
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);

            -- Criar policy de isolamento por tenant
            -- Usa a variável de sessão app.current_tenant_id
            EXECUTE format(
                'CREATE POLICY tenant_isolation ON %I ' ||
                'USING (tenant_id::text = current_setting(''app.current_tenant_id'', true)) ' ||
                'WITH CHECK (tenant_id::text = current_setting(''app.current_tenant_id'', true))',
                tbl
            );

            RAISE NOTICE 'RLS habilitado na tabela: %', tbl;
        ELSE
            RAISE NOTICE 'Tabela % não existe, pulando...', tbl;
        END IF;
    END LOOP;
END $$;

-- Policy especial para super_admin (bypass RLS)
-- O super admin precisa acessar dados de todos os tenants
-- Isso é feito via SET ROLE ou variável de sessão

-- Criar role para aplicação (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'menufacil_app') THEN
        CREATE ROLE menufacil_app;
    END IF;
END $$;
