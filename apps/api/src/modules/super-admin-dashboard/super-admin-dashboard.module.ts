import { Module } from '@nestjs/common';
import { SuperAdminDashboardService } from './super-admin-dashboard.service';
import { SuperAdminDashboardController } from './super-admin-dashboard.controller';

@Module({
  controllers: [SuperAdminDashboardController],
  providers: [SuperAdminDashboardService],
})
export class SuperAdminDashboardModule {}
