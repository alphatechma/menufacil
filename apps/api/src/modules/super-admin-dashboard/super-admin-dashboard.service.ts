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

    // MRR = sum of plan prices for all active tenants
    const [mrrStats] = await this.dataSource.query(`
      SELECT COALESCE(SUM(p.price), 0)::numeric as mrr
      FROM tenants t
      JOIN plans p ON t.plan_id = p.id
      WHERE t.is_active = true
    `);

    const tenantsByPlan = await this.dataSource.query(`
      SELECT
        COALESCE(p.name, 'Sem Plano') as plan_name,
        COALESCE(p.price, 0)::numeric as plan_price,
        COUNT(t.id)::int as count
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      GROUP BY p.name, p.price
      ORDER BY count DESC
    `);

    return {
      total_tenants: tenantStats.total_tenants,
      active_tenants: tenantStats.active_tenants,
      total_users: userStats.total_users,
      mrr: parseFloat(mrrStats.mrr) || 0,
      tenants_by_plan: tenantsByPlan.map((r: any) => ({
        plan_name: r.plan_name,
        plan_price: parseFloat(r.plan_price) || 0,
        count: r.count,
        revenue: (parseFloat(r.plan_price) || 0) * r.count,
      })),
    };
  }

  async getAdvancedStats(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const periodMs = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - periodMs);
    const prevTo = new Date(fromDate);

    // New tenants in current period
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

    // MRR trend by day (new tenants contributing to MRR)
    const mrrByDay = await this.dataSource.query(
      `SELECT
        TO_CHAR(t.created_at, 'YYYY-MM-DD') as date,
        COUNT(t.id)::int as new_tenants,
        COALESCE(SUM(p.price), 0)::numeric as new_mrr
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      WHERE t.created_at >= $1 AND t.created_at <= $2
      GROUP BY TO_CHAR(t.created_at, 'YYYY-MM-DD')
      ORDER BY date ASC`,
      [fromDate, toDate],
    );

    // Tenants by plan with revenue contribution
    const planDistribution = await this.dataSource.query(
      `SELECT
        COALESCE(p.name, 'Sem Plano') as plan_name,
        COALESCE(p.price, 0)::numeric as plan_price,
        COUNT(t.id)::int as tenant_count,
        (COALESCE(p.price, 0) * COUNT(t.id))::numeric as monthly_revenue
      FROM tenants t
      LEFT JOIN plans p ON t.plan_id = p.id
      WHERE t.is_active = true
      GROUP BY p.name, p.price
      ORDER BY monthly_revenue DESC`,
    );

    // Recent signups (last 5)
    const recentSignups = await this.dataSource.query(
      `SELECT t.id, t.name, t.slug, COALESCE(p.name, 'Sem Plano') as plan,
        COALESCE(p.price, 0)::numeric as plan_price, t.created_at as "createdAt"
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
      mrrByDay: mrrByDay.map((r: any) => ({
        date: r.date,
        newTenants: r.new_tenants,
        newMrr: parseFloat(r.new_mrr) || 0,
      })),
      planDistribution: planDistribution.map((r: any) => ({
        planName: r.plan_name,
        planPrice: parseFloat(r.plan_price) || 0,
        tenantCount: r.tenant_count,
        monthlyRevenue: parseFloat(r.monthly_revenue) || 0,
      })),
      recentSignups: recentSignups.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        plan: r.plan,
        planPrice: parseFloat(r.plan_price) || 0,
        createdAt: r.createdAt,
      })),
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
}
