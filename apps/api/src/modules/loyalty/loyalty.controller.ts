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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { UserRole } from '@menufacil/shared';
import { LoyaltyService } from './loyalty.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { CurrentTenant, CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Loyalty')
@ApiSecurity('tenant-slug')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  @Get('rewards')
  @ApiOperation({ summary: 'List available rewards (public)' })
  findRewards(@CurrentTenant('id') tenantId: string) {
    return this.service.findActiveRewards(tenantId);
  }

  @Get('rewards/all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.KITCHEN)
  @ApiOperation({ summary: 'List all rewards including inactive (admin)' })
  findAllRewards(@CurrentTenant('id') tenantId: string) {
    return this.service.findRewards(tenantId);
  }

  @Post('rewards')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Create a reward' })
  createReward(@Body() dto: CreateRewardDto, @CurrentTenant('id') tenantId: string) {
    return this.service.createReward(dto, tenantId);
  }

  @Put('rewards/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Update a reward' })
  updateReward(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.updateReward(id, tenantId, dto);
  }

  @Delete('rewards/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
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
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
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
