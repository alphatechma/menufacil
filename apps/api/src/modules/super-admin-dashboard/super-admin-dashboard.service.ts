import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SuperAdminDashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getStats() {
    const [tenantStats] = await this.dataSource.query(`
      SELECT
        COUNT(*)::int as total_tenants,
        COUNT(*) FILTER (WHERE is_active = true)::int as active_tenants
      FROM tenants
    `);

    const [userStats] = await this.dataSource.query(`
      SELECT COUNT(*)::int as total_users FROM users WHERE system_role != 'super_admin'
    `);

    const [orderStats] = await this.dataSource.query(`
      SELECT
        COUNT(*)::int as total_orders,
        COALESCE(SUM(total), 0)::numeric as total_revenue
      FROM orders
    `);

    const tenantsByPlan = await this.dataSource.query(`
      SELECT
        COALESCE(p.name, 'Sem Plano') as plan_name,
        COUNT(t.id)::int as count
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      GROUP BY p.name
      ORDER BY count DESC
    `);

    return {
      total_tenants: tenantStats.total_tenants,
      active_tenants: tenantStats.active_tenants,
      total_users: userStats.total_users,
      total_orders: orderStats.total_orders,
      total_revenue: parseFloat(orderStats.total_revenue) || 0,
      tenants_by_plan: tenantsByPlan,
    };
  }
}
