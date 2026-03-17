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

    // ── 2. FIX column types: varchar → uuid ──
    await queryRunner.query(`ALTER TABLE order_items ALTER COLUMN product_id TYPE uuid USING product_id::uuid`);
    await queryRunner.query(`ALTER TABLE order_items ALTER COLUMN variation_id TYPE uuid USING variation_id::uuid`);
    await queryRunner.query(`ALTER TABLE payment_transactions ALTER COLUMN order_id TYPE uuid USING order_id::uuid`);

    // ── 3. ADD FK constraints (NOT VALID = don't block on existing data) ──
    await queryRunner.query(`ALTER TABLE order_items ADD CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL NOT VALID`);
    await queryRunner.query(`ALTER TABLE order_items ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE NOT VALID`);
    await queryRunner.query(`ALTER TABLE order_item_extras ADD CONSTRAINT fk_order_item_extras_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE NOT VALID`);
    await queryRunner.query(`ALTER TABLE payment_transactions ADD CONSTRAINT fk_payment_transactions_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE NOT VALID`);

    // ── 4. FIX numeric precision ──
    await queryRunner.query(`ALTER TABLE cash_registers ALTER COLUMN opening_balance TYPE numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE cash_registers ALTER COLUMN closing_balance TYPE numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE cash_registers ALTER COLUMN total_cash TYPE numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE cash_registers ALTER COLUMN total_credit TYPE numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE cash_registers ALTER COLUMN total_debit TYPE numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE cash_registers ALTER COLUMN total_pix TYPE numeric(10,2)`);

    // ── 5. Missing columns ──
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
