import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
}
