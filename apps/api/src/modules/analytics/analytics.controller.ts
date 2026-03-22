import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { CustomerSegmentationService } from './customer-segmentation.service';
import { CurrentTenant, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Analytics')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly segmentationService: CustomerSegmentationService,
  ) {}

  @Get('overview')
  @RequirePermissions('report:read')
  @ApiOperation({ summary: 'Get analytics overview (KPIs, revenue, orders)' })
  getOverview(
    @CurrentTenant('id') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.analyticsService.getOverview(tenantId, from, to);
  }

  @Get('products')
  @RequirePermissions('report:read')
  @ApiOperation({ summary: 'Get product analytics (top products, categories, profitability)' })
  getProducts(
    @CurrentTenant('id') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.analyticsService.getProducts(tenantId, from, to);
  }

  @Get('customers')
  @RequirePermissions('report:read')
  @ApiOperation({ summary: 'Get customer analytics (new vs returning, top customers, RFM)' })
  getCustomers(
    @CurrentTenant('id') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.analyticsService.getCustomers(tenantId, from, to);
  }

  @Get('delivery')
  @RequirePermissions('report:read')
  @ApiOperation({ summary: 'Get delivery analytics (persons, times, zones)' })
  getDelivery(
    @CurrentTenant('id') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.analyticsService.getDelivery(tenantId, from, to);
  }

  @Get('export/csv')
  @RequirePermissions('report:read')
  @ApiOperation({ summary: 'Export analytics data as CSV' })
  async exportCsv(
    @CurrentTenant('id') tenantId: string,
    @Query('type') type: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const csv = await this.analyticsService.exportCsv(tenantId, type, from, to);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=analytics-${type}-${from}-${to}.csv`,
    );
    res.send(csv);
  }

  @Get('segments')
  @RequirePermissions('report:read')
  @ApiOperation({ summary: 'Get customer segments (RFM analysis)' })
  getSegments(@CurrentTenant('id') tenantId: string) {
    return this.segmentationService.getSegments(tenantId);
  }

  @Get('segments/:customerId')
  @RequirePermissions('report:read')
  @ApiOperation({ summary: 'Get segment for a specific customer' })
  getCustomerSegment(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.segmentationService.getCustomerSegment(customerId, tenantId);
  }
}
