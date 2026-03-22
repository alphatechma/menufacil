import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../../common/guards';
import { AuditLogService } from './audit-log.service';

@ApiTags('Super Admin - Audit Logs')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
@Controller('super-admin/audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs with filters and pagination' })
  findAll(
    @Query('action') action?: string,
    @Query('entity_type') entity_type?: string,
    @Query('user_id') user_id?: string,
    @Query('user_email') user_email?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.findAll({
      action,
      entity_type,
      user_id,
      user_email,
      from,
      to,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit log statistics for last 30 days' })
  getStats() {
    return this.auditLogService.getStats();
  }
}
