import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SuperAdminDashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getAdvancedStats(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const periodMs = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - periodMs);
    const prevTo = new Date(fromDate);

    // New tenants current period
    const [newTenantsCurrent] = await this.dataSource.query(
      `SELECT COUNT(*)::int as count FROM tenants WHERE created_at >= $1 AND created_at <= $2`,
      [fromDate, toDate],
    );
    const [newTenantsPrevious] = await this.dataSource.query(
      `SELECT COUNT(*)::int as count FROM tenants WHERE created_at >= $1 AND created_at < $2`,
      [prevFrom, prevTo],
    );
    const newTenantsChange = newTenantsPrevious.count > 0
      ? ((newTenantsCurrent.count - newTenantsPrevious.count) / newTenantsPrevious.count) * 100
      : newTenantsCurrent.count > 0 ? 100 : 0;

    // Churned tenants (deactivated in period)
    const [churnCurrent] = await this.dataSource.query(
      `SELECT COUNT(*)::int as count FROM tenants WHERE is_active = false AND updated_at >= $1 AND updated_at <= $2`,
      [fromDate, toDate],
    );
    const [churnPrevious] = await this.dataSource.query(
      `SELECT COUNT(*)::int as count FROM tenants WHERE is_active = false AND updated_at >= $1 AND updated_at < $2`,
      [prevFrom, prevTo],
    );
    const churnChange = churnPrevious.count > 0
      ? ((churnCurrent.count - churnPrevious.count) / churnPrevious.count) * 100
      : churnCurrent.count > 0 ? 100 : 0;

    // Revenue by day
    const revenueByDay = await this.dataSource.query(
      `SELECT
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COALESCE(SUM(total), 0)::numeric as revenue
      FROM orders
      WHERE status != 'cancelled' AND created_at >= $1 AND created_at <= $2
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY date ASC`,
      [fromDate, toDate],
    );

    // Top 5 tenants by revenue
    const topTenants = await this.dataSource.query(
      `SELECT
        t.id, t.name,
        COALESCE(SUM(o.total), 0)::numeric as revenue,
        COUNT(o.id)::int as orders
      FROM tenants t
      LEFT JOIN orders o ON o.tenant_id = t.id AND o.status != 'cancelled' AND o.created_at >= $1 AND o.created_at <= $2
      GROUP BY t.id, t.name
      HAVING COALESCE(SUM(o.total), 0) > 0
      ORDER BY revenue DESC
      LIMIT 5`,
      [fromDate, toDate],
    );

    // Recent signups (last 5)
    const recentSignups = await this.dataSource.query(
      `SELECT t.id, t.name, COALESCE(p.name, 'Sem Plano') as plan, t.created_at as "createdAt"
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      ORDER BY t.created_at DESC
      LIMIT 5`,
    );

    return {
      newTenants: {
        current: newTenantsCurrent.count,
        previous: newTenantsPrevious.count,
        change: Math.round(newTenantsChange * 10) / 10,
      },
      churnedTenants: {
        current: churnCurrent.count,
        previous: churnPrevious.count,
        change: Math.round(churnChange * 10) / 10,
      },
      revenueByDay: revenueByDay.map((r: any) => ({
        date: r.date,
        revenue: parseFloat(r.revenue) || 0,
      })),
      topTenants: topTenants.map((t: any) => ({
        id: t.id,
        name: t.name,
        revenue: parseFloat(t.revenue) || 0,
        orders: t.orders,
      })),
      recentSignups,
    };
  }

  async bulkUpdateTenants(action: string, ids: string[], planId?: string) {
    if (action === 'activate') {
      await this.dataSource.query(
        `UPDATE tenants SET is_active = true, updated_at = NOW() WHERE id = ANY($1)`,
        [ids],
      );
    } else if (action === 'deactivate') {
      await this.dataSource.query(
        `UPDATE tenants SET is_active = false, updated_at = NOW() WHERE id = ANY($1)`,
        [ids],
      );
    } else if (action === 'change_plan' && planId) {
      await this.dataSource.query(
        `UPDATE tenants SET plan_id = $1, updated_at = NOW() WHERE id = ANY($2)`,
        [planId, ids],
      );
    }
    return { success: true, affected: ids.length };
  }

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
      WHERE status != 'cancelled'
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
