import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1711900000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1711900000000';

  private async safeIndex(queryRunner: QueryRunner, sql: string): Promise<void> {
    try {
      await queryRunner.query(sql);
    } catch {
      // Tabela pode não existir ainda — ignorar silenciosamente
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const idx = (name: string, table: string, cols: string) =>
      this.safeIndex(queryRunner, `CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${cols})`);

    // Orders
    await idx('idx_orders_tenant_id', 'orders', 'tenant_id');
    await idx('idx_orders_status', 'orders', 'status');
    await idx('idx_orders_created_at', 'orders', 'created_at DESC');
    await idx('idx_orders_customer_id', 'orders', 'customer_id');
    await idx('idx_orders_delivery_person_id', 'orders', 'delivery_person_id');
    await idx('idx_orders_tenant_status', 'orders', 'tenant_id, status');
    await idx('idx_orders_tenant_created', 'orders', 'tenant_id, created_at DESC');

    // Order Items
    await idx('idx_order_items_order_id', 'order_items', 'order_id');
    await idx('idx_order_items_product_id', 'order_items', 'product_id');

    // Products
    await idx('idx_products_tenant_id', 'products', 'tenant_id');
    await idx('idx_products_category_id', 'products', 'category_id');
    await idx('idx_products_is_active', 'products', 'tenant_id, is_active');

    // Categories
    await idx('idx_categories_tenant_id', 'categories', 'tenant_id');

    // Customers
    await idx('idx_customers_tenant_id', 'customers', 'tenant_id');
    await idx('idx_customers_phone', 'customers', 'phone');
    await idx('idx_customers_email', 'customers', 'email');

    // Users
    await idx('idx_users_tenant_id', 'users', 'tenant_id');
    await idx('idx_users_email', 'users', 'email');

    // Tenants
    await idx('idx_tenants_slug', 'tenants', 'slug');
    await idx('idx_tenants_is_active', 'tenants', 'is_active');

    // Delivery
    await idx('idx_delivery_persons_tenant_id', 'delivery_persons', 'tenant_id');
    await idx('idx_delivery_zones_tenant_id', 'delivery_zones', 'tenant_id');

    // Loyalty
    await idx('idx_loyalty_redemptions_customer_id', 'loyalty_redemptions', 'customer_id');
    await idx('idx_loyalty_redemptions_tenant_id', 'loyalty_redemptions', 'tenant_id');

    // Reviews (tabela pode não existir)
    await idx('idx_reviews_tenant_id', 'reviews', 'tenant_id');
    await idx('idx_reviews_order_id', 'reviews', 'order_id');

    // Cash Register
    await idx('idx_cash_registers_tenant_id', 'cash_registers', 'tenant_id');
    await idx('idx_cash_registers_is_open', 'cash_registers', 'tenant_id, is_open');

    // Tables
    await idx('idx_restaurant_tables_tenant_id', 'restaurant_tables', 'tenant_id');

    // Reservations
    await idx('idx_reservations_tenant_id', 'reservations', 'tenant_id');

    // Inventory (tabela pode não existir)
    await idx('idx_inventory_items_tenant_id', 'inventory_items', 'tenant_id');
    await idx('idx_stock_movements_inventory_item_id', 'stock_movements', 'inventory_item_id');

    // Wallets (tabela pode não existir)
    await idx('idx_wallets_customer_id', 'wallets', 'customer_id');
    await idx('idx_wallet_transactions_wallet_id', 'wallet_transactions', 'wallet_id');

    // Promotions (tabela pode não existir)
    await idx('idx_promotions_tenant_id', 'promotions', 'tenant_id');
    await idx('idx_promotions_is_active', 'promotions', 'tenant_id, is_active');

    // Referrals (tabela pode não existir)
    await idx('idx_referrals_tenant_id', 'referrals', 'tenant_id');
    await idx('idx_referrals_referrer_id', 'referrals', 'referrer_id');

    // Coupons
    await idx('idx_coupons_tenant_id', 'coupons', 'tenant_id');

    // Notifications (tabela pode não existir)
    await idx('idx_notifications_tenant_id', 'notifications', 'tenant_id');

    // WhatsApp (tabela pode não existir)
    await idx('idx_whatsapp_messages_tenant_id', 'whatsapp_messages', 'tenant_id');
    await idx('idx_whatsapp_instances_tenant_id', 'whatsapp_instances', 'tenant_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
    for (const name of indexes) {
      try { await queryRunner.query(`DROP INDEX IF EXISTS ${name}`); } catch { /* ignore */ }
    }
  }
}
