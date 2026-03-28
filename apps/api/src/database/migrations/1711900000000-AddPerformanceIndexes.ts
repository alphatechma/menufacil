import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1711900000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1711900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Orders — most queried table
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders (tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_delivery_person_id ON orders (delivery_person_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders (tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders (tenant_id, created_at DESC)`);

    // Order Items
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id)`);

    // Products
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products (tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (tenant_id, is_active)`);

    // Categories
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON categories (tenant_id)`);

    // Customers
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers (tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email)`);

    // Users
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`);

    // Tenants
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants (slug)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants (is_active)`);

    // Delivery
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_delivery_persons_tenant_id ON delivery_persons (tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_delivery_zones_tenant_id ON delivery_zones (tenant_id)`);

    // Loyalty
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_customer_id ON loyalty_redemptions (customer_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_tenant_id ON loyalty_redemptions (tenant_id)`);

    // Reviews
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reviews_tenant_id ON reviews (tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews (order_id)`);

    // Cash Register
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant_id ON cash_registers (tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_cash_registers_is_open ON cash_registers (tenant_id, is_open)`);

    // Tables
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_restaurant_tables_tenant_id ON restaurant_tables (tenant_id)`);

    // Reservations
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_reservations_tenant_id ON reservations (tenant_id)`);

    // Inventory
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_id ON inventory_items (tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory_item_id ON stock_movements (inventory_item_id)`);

    // Wallets
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_wallets_customer_id ON wallets (customer_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions (wallet_id)`);

    // Promotions
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_promotions_tenant_id ON promotions (tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_promotions_is_active ON promotions (tenant_id, is_active)`);

    // Referrals
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_referrals_tenant_id ON referrals (tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals (referrer_id)`);

    // Coupons
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coupons_tenant_id ON coupons (tenant_id)`);

    // Notifications
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications (tenant_id)`);

    // WhatsApp
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_id ON whatsapp_messages (tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_tenant_id ON whatsapp_instances (tenant_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes created above
    const indexes = [
      'idx_orders_tenant_id', 'idx_orders_status', 'idx_orders_created_at',
      'idx_orders_customer_id', 'idx_orders_delivery_person_id',
      'idx_orders_tenant_status', 'idx_orders_tenant_created',
      'idx_order_items_order_id', 'idx_order_items_product_id',
      'idx_products_tenant_id', 'idx_products_category_id', 'idx_products_is_active',
      'idx_categories_tenant_id',
      'idx_customers_tenant_id', 'idx_customers_phone', 'idx_customers_email',
      'idx_users_tenant_id', 'idx_users_email',
      'idx_tenants_slug', 'idx_tenants_is_active',
      'idx_delivery_persons_tenant_id', 'idx_delivery_zones_tenant_id',
      'idx_loyalty_redemptions_customer_id', 'idx_loyalty_redemptions_tenant_id',
      'idx_reviews_tenant_id', 'idx_reviews_order_id',
      'idx_cash_registers_tenant_id', 'idx_cash_registers_is_open',
      'idx_restaurant_tables_tenant_id', 'idx_reservations_tenant_id',
      'idx_inventory_items_tenant_id', 'idx_stock_movements_inventory_item_id',
      'idx_wallets_customer_id', 'idx_wallet_transactions_wallet_id',
      'idx_promotions_tenant_id', 'idx_promotions_is_active',
      'idx_referrals_tenant_id', 'idx_referrals_referrer_id',
      'idx_coupons_tenant_id', 'idx_notifications_tenant_id',
      'idx_whatsapp_messages_tenant_id', 'idx_whatsapp_instances_tenant_id',
    ];
    for (const idx of indexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${idx}`);
    }
  }
}
