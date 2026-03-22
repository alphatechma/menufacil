import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { CurrentTenant, CurrentUser, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Referral')
@ApiSecurity('tenant-slug')
@Controller('referrals')
export class ReferralController {
  private readonly logger = new Logger(ReferralController.name);

  constructor(private readonly service: ReferralService) {}

  @Get('my-code')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my referral code (customer)' })
  async getMyCode(
    @CurrentUser('id') customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.getMyCode(customerId, tenantId);
  }

  @Get('my-referrals')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my referrals (customer)' })
  async getMyReferrals(
    @CurrentUser('id') customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.getMyReferrals(customerId, tenantId);
  }

  @Post('apply')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply a referral code (customer)' })
  async applyReferral(
    @Body() body: { code: string },
    @CurrentUser('id') customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    await this.service.applyReferral(customerId, body.code, tenantId);
    return { success: true, message: 'Código de indicação aplicado com sucesso!' };
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('loyalty:read')
  @ApiOperation({ summary: 'Get referral stats (admin)' })
  async getStats(@CurrentTenant('id') tenantId: string) {
    return this.service.getReferralStats(tenantId);
  }
}
