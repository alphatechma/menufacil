import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { CreateTierDto } from './dto/create-tier.dto';
import { CurrentTenant, CurrentUser, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Loyalty')
@ApiSecurity('tenant-slug')
@Controller('loyalty')
export class LoyaltyController {
  private readonly logger = new Logger(LoyaltyController.name);

  constructor(private readonly service: LoyaltyService) {}

  // ─── Tier Endpoints ────────────────────────────────────────

  @Get('tiers')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('loyalty:read')
  @ApiOperation({ summary: 'List all loyalty tiers (admin)' })
  async getTiers(@CurrentTenant('id') tenantId: string) {
    return this.service.getTiers(tenantId);
  }

  @Get('tiers/public')
  @ApiOperation({ summary: 'List loyalty tiers (public)' })
  async getPublicTiers(@CurrentTenant('id') tenantId: string) {
    return this.service.getTiers(tenantId);
  }

  @Post('tiers')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('loyalty:create')
  @ApiOperation({ summary: 'Create a loyalty tier' })
  async createTier(@Body() dto: CreateTierDto, @CurrentTenant('id') tenantId: string) {
    return this.service.createTier(tenantId, dto);
  }

  @Put('tiers/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('loyalty:update')
  @ApiOperation({ summary: 'Update a loyalty tier' })
  async updateTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateTierDto>,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.updateTier(tenantId, id, dto);
  }

  @Delete('tiers/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('loyalty:delete')
  @ApiOperation({ summary: 'Delete a loyalty tier' })
  async deleteTier(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.deleteTier(tenantId, id);
  }

  @Post('tiers/seed')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('loyalty:create')
  @ApiOperation({ summary: 'Seed default loyalty tiers' })
  async seedTiers(@CurrentTenant('id') tenantId: string) {
    return this.service.seedDefaultTiers(tenantId);
  }

  @Get('my-tier')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my current tier (customer)' })
  async getMyTier(
    @CurrentUser('id') customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.getCustomerTier(tenantId, customerId);
  }

  // ─── Reward Endpoints ──────────────────────────────────────

  @Get('rewards/all')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('loyalty:read')
  @ApiOperation({ summary: 'List all rewards including inactive (admin)' })
  async findAllRewards(@CurrentTenant('id') tenantId: string) {
    this.logger.log(`[GET rewards/all] tenantId=${tenantId}`);
    const rewards = await this.service.findRewards(tenantId);
    this.logger.log(`[GET rewards/all] found ${rewards.length} rewards`);
    return rewards;
  }

  @Get('rewards')
  @ApiOperation({ summary: 'List available rewards (public)' })
  async findRewards(@CurrentTenant('id') tenantId: string) {
    this.logger.log(`[GET rewards] (public) tenantId=${tenantId}`);
    const rewards = await this.service.findActiveRewards(tenantId);
    this.logger.log(`[GET rewards] (public) found ${rewards.length} active rewards`);
    return rewards;
  }

  @Post('rewards')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('loyalty:create')
  @ApiOperation({ summary: 'Create a reward' })
  async createReward(@Body() dto: CreateRewardDto, @CurrentTenant('id') tenantId: string) {
    this.logger.log(`[POST rewards] tenantId=${tenantId} data=${JSON.stringify(dto)}`);
    return this.service.createReward(dto, tenantId);
  }

  @Put('rewards/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('loyalty:update')
  @ApiOperation({ summary: 'Update a reward' })
  updateReward(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.updateReward(id, tenantId, dto);
  }

  @Delete('rewards/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('loyalty:delete')
  @ApiOperation({ summary: 'Delete a reward' })
  removeReward(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.removeReward(id, tenantId);
  }

  @Post('redeem/:rewardId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Redeem a reward (customer)' })
  redeem(
    @Param('rewardId', ParseUUIDPipe) rewardId: string,
    @CurrentUser('id') customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.redeemReward(customerId, rewardId, tenantId);
  }

  @Get('redemptions/my')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my redemption history (customer)' })
  myRedemptions(
    @CurrentUser('id') customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.getCustomerRedemptions(customerId, tenantId);
  }

  @Get('redemptions')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('loyalty:read')
  @ApiOperation({ summary: 'Get all redemptions (admin)' })
  allRedemptions(@CurrentTenant('id') tenantId: string) {
    return this.service.getAllRedemptions(tenantId);
  }

  @Get('redemptions/validate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate a loyalty coupon code' })
  validateCoupon(
    @Query('code') code: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.validateRedemptionCoupon(code, tenantId);
  }
}
