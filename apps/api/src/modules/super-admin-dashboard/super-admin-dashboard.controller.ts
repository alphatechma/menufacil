import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../../common/guards';
import { SuperAdminDashboardService } from './super-admin-dashboard.service';

@ApiTags('Super Admin - Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
@Controller('super-admin/dashboard')
export class SuperAdminDashboardController {
  constructor(private readonly dashboardService: SuperAdminDashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('advanced-stats')
  @ApiOperation({ summary: 'Get advanced dashboard statistics with date range' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  getAdvancedStats(@Query('from') from: string, @Query('to') to: string) {
    return this.dashboardService.getAdvancedStats(from, to);
  }

  @Put('bulk-tenants')
  @ApiOperation({ summary: 'Bulk update tenants (activate, deactivate, change plan)' })
  bulkUpdateTenants(
    @Body() body: { action: string; ids: string[]; planId?: string },
  ) {
    return this.dashboardService.bulkUpdateTenants(body.action, body.ids, body.planId);
  }
}
