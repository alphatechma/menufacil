import { MigrationInterface, QueryRunner } from 'typeorm';

export class DatabaseOptimizations1710500000000 implements MigrationInterface {
  name = 'DatabaseOptimizations1710500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. INDEXES on Foreign Keys and frequently queried columns ──

    // Orders (most queried table)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(tenant_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id) WHERE customer_id IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_delivery_person ON orders(delivery_person_id) WHERE delivery_person_id IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_unit ON orders(unit_id) WHERE unit_id IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(tenant_id, payment_status)`);

    // Order Items
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_order_item_extras_item ON order_item_extras(order_item_id)`);

    // Products & Categories
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_tenant_active ON products(tenant_id, is_active) WHERE is_active = true`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_categories_tenant_sort ON categories(tenant_id, sort_order)`);

    // Customers
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL`);

    // Delivery
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_delivery_zones_tenant ON delivery_zones(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_delivery_persons_tenant ON delivery_persons(tenant_id)`);

    // Extras
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_extra_groups_tenant ON extra_groups(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_extras_group ON extras(group_id)`);

    // Other FKs
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coupons_tenant ON coupons(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(tenant_id, code)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_tenant ON loyalty_redemptions(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_customer ON loyalty_redemptions(customer_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_tenant ON loyalty_rewards(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant ON payment_transactions(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions(order_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_product_variations_product ON product_variations(product_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tables_tenant ON tables(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_table_sessions_table ON table_sessions(table_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_floor_plans_tenant ON floor_plans(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tenant_units_tenant ON tenant_units(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON reservations(tenant_id)`);

    // WhatsApp
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant ON whatsapp_messages(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(tenant_id, customer_phone)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(tenant_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_flows_tenant ON whatsapp_flows(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_execs_tenant ON whatsapp_flow_executions(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_execs_flow ON whatsapp_flow_executions(flow_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_tenant ON whatsapp_instances(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant ON whatsapp_message_templates(tenant_id)`);

    // Cash Registers
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant ON cash_registers(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_cash_registers_open ON cash_registers(tenant_id, is_open) WHERE is_open = true`);

    // ── 2. FIX column types: varchar → uuid (skip if already uuid) ──
    const uuidFixes = [
      { table: 'order_items', col: 'product_id' },
      { table: 'order_items', col: 'variation_id' },
      { table: 'payment_transactions', col: 'order_id' },
    ];
    for (const { table, col } of uuidFixes) {
      const colInfo = await queryRunner.query(`SELECT data_type FROM information_schema.columns WHERE table_name='${table}' AND column_name='${col}'`);
      if (colInfo.length > 0 && colInfo[0].data_type !== 'uuid') {
        await queryRunner.query(`ALTER TABLE ${table} ALTER COLUMN ${col} TYPE uuid USING ${col}::uuid`);
      }
    }

    // ── 3. ADD FK constraints (idempotent — skip if already exists) ──
    const fks = [
      { table: 'order_items', name: 'fk_order_items_product', sql: 'ALTER TABLE order_items ADD CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL NOT VALID' },
      { table: 'order_items', name: 'fk_order_items_order', sql: 'ALTER TABLE order_items ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE NOT VALID' },
      { table: 'order_item_extras', name: 'fk_order_item_extras_item', sql: 'ALTER TABLE order_item_extras ADD CONSTRAINT fk_order_item_extras_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE NOT VALID' },
      { table: 'payment_transactions', name: 'fk_payment_transactions_order', sql: 'ALTER TABLE payment_transactions ADD CONSTRAINT fk_payment_transactions_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE NOT VALID' },
    ];
    for (const fk of fks) {
      const exists = await queryRunner.query(`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = '${fk.name}' AND table_name = '${fk.table}'`);
      if (exists.length === 0) {
        await queryRunner.query(fk.sql);
      }
    }

    // ── 4. FIX numeric precision (safe to re-run) ──
    for (const col of ['opening_balance', 'closing_balance', 'total_cash', 'total_credit', 'total_debit', 'total_pix']) {
      await queryRunner.query(`ALTER TABLE cash_registers ALTER COLUMN ${col} TYPE numeric(10,2)`);
    }

    // ── 5. TIMESTAMPTZ conversion (all tables, skip if already timestamptz) ──
    const timestampTables = [
      { table: 'coupons', cols: ['created_at', 'valid_from', 'valid_until'] },
      { table: 'delivery_persons', cols: ['created_at', 'updated_at'] },
      { table: 'floor_plans', cols: ['created_at', 'updated_at'] },
      { table: 'loyalty_redemptions', cols: ['created_at', 'expires_at', 'used_at'] },
      { table: 'loyalty_rewards', cols: ['created_at', 'updated_at'] },
      { table: 'notifications', cols: ['created_at', 'sent_at'] },
      { table: 'permissions', cols: ['created_at', 'updated_at'] },
      { table: 'plans', cols: ['created_at', 'updated_at'] },
      { table: 'reservations', cols: ['created_at', 'updated_at'] },
      { table: 'roles', cols: ['created_at', 'updated_at'] },
      { table: 'system_modules', cols: ['created_at', 'updated_at'] },
      { table: 'table_sessions', cols: ['created_at', 'updated_at', 'opened_at', 'closed_at'] },
      { table: 'tables', cols: ['created_at', 'updated_at'] },
      { table: 'tenant_units', cols: ['created_at', 'updated_at'] },
      { table: 'tenants', cols: ['created_at', 'updated_at', 'deleted_at', 'trial_ends_at'] },
      { table: 'users', cols: ['created_at', 'updated_at', 'token_revoked_at'] },
      { table: 'whatsapp_flow_executions', cols: ['created_at', 'updated_at', 'started_at', 'completed_at'] },
      { table: 'whatsapp_flows', cols: ['created_at', 'updated_at'] },
      { table: 'whatsapp_instances', cols: ['created_at', 'updated_at'] },
      { table: 'whatsapp_message_templates', cols: ['created_at', 'updated_at'] },
    ];
    for (const { table, cols } of timestampTables) {
      for (const col of cols) {
        const colInfo = await queryRunner.query(`SELECT data_type FROM information_schema.columns WHERE table_name='${table}' AND column_name='${col}'`);
        if (colInfo.length > 0 && colInfo[0].data_type === 'timestamp without time zone') {
          await queryRunner.query(`ALTER TABLE ${table} ALTER COLUMN ${col} TYPE timestamptz USING ${col} AT TIME ZONE 'America/Sao_Paulo'`);
        }
      }
    }

    // ── 6. FIX more varchar → uuid columns (skip if already uuid) ──
    const moreUuidFixes = [
      { table: 'notifications', col: 'order_id' },
      { table: 'reservations', col: 'customer_id' },
      { table: 'reservations', col: 'table_id' },
      { table: 'whatsapp_flow_executions', col: 'tenant_id' },
    ];
    for (const { table, col } of moreUuidFixes) {
      const colInfo = await queryRunner.query(`SELECT data_type FROM information_schema.columns WHERE table_name='${table}' AND column_name='${col}'`);
      if (colInfo.length > 0 && colInfo[0].data_type !== 'uuid') {
        await queryRunner.query(`ALTER TABLE ${table} ALTER COLUMN ${col} TYPE uuid USING ${col}::uuid`);
      }
    }

    // ── 8. Missing columns ──
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cancel_time_limit INTEGER DEFAULT 5`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_config jsonb`);
    await queryRunner.query(`ALTER TABLE delivery_persons ADD COLUMN IF NOT EXISTS receives_delivery_fee BOOLEAN DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes (safe to re-create)
    const indexes = [
      'idx_orders_tenant_status', 'idx_orders_tenant_created', 'idx_orders_customer',
      'idx_orders_delivery_person', 'idx_orders_unit', 'idx_orders_payment_status',
      'idx_order_items_order', 'idx_order_items_product', 'idx_order_item_extras_item',
      'idx_products_tenant', 'idx_products_category', 'idx_products_tenant_active',
      'idx_categories_tenant', 'idx_categories_tenant_sort',
      'idx_customers_tenant', 'idx_customers_tenant_phone', 'idx_customers_email',
      'idx_delivery_zones_tenant', 'idx_delivery_persons_tenant',
      'idx_extra_groups_tenant', 'idx_extras_group',
      'idx_customer_addresses_customer', 'idx_coupons_tenant', 'idx_coupons_code',
      'idx_loyalty_redemptions_tenant', 'idx_loyalty_redemptions_customer', 'idx_loyalty_rewards_tenant',
      'idx_notifications_tenant', 'idx_payment_transactions_tenant', 'idx_payment_transactions_order',
      'idx_product_variations_product', 'idx_tables_tenant', 'idx_table_sessions_table',
      'idx_floor_plans_tenant', 'idx_users_tenant', 'idx_tenant_units_tenant', 'idx_reservations_tenant',
      'idx_whatsapp_messages_tenant', 'idx_whatsapp_messages_phone', 'idx_whatsapp_messages_created',
      'idx_whatsapp_flows_tenant', 'idx_whatsapp_flow_execs_tenant', 'idx_whatsapp_flow_execs_flow',
      'idx_whatsapp_instances_tenant', 'idx_whatsapp_templates_tenant',
      'idx_cash_registers_tenant', 'idx_cash_registers_open',
    ];
    for (const idx of indexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${idx}`);
    }

    // Drop FK constraints
    await queryRunner.query(`ALTER TABLE order_items DROP CONSTRAINT IF EXISTS fk_order_items_product`);
    await queryRunner.query(`ALTER TABLE order_items DROP CONSTRAINT IF EXISTS fk_order_items_order`);
    await queryRunner.query(`ALTER TABLE order_item_extras DROP CONSTRAINT IF EXISTS fk_order_item_extras_item`);
    await queryRunner.query(`ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS fk_payment_transactions_order`);
  }
}
