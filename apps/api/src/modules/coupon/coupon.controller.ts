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
import { RewardType } from '@menufacil/shared';
import { CouponService } from './coupon.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CurrentTenant, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Coupons')
@ApiSecurity('tenant-slug')
@Controller('coupons')
export class CouponController {
  constructor(
    private readonly service: CouponService,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  @Get('validate')
  @ApiOperation({ summary: 'Validate a coupon code (regular or loyalty)' })
  async validate(
    @Query('code') code: string,
    @Query('total') total: number,
    @CurrentTenant('id') tenantId: string,
  ) {
    const upperCode = (code || '').toUpperCase();

    // First try loyalty redemption coupon
    const loyaltyResult = await this.loyaltyService.validateRedemptionCoupon(upperCode, tenantId);
    if (loyaltyResult.valid && loyaltyResult.redemption) {
      const reward = loyaltyResult.redemption.reward;
      let discount = 0;
      if (reward.reward_type === RewardType.DISCOUNT_PERCENT) {
        discount = (Number(total) * Number(reward.reward_value)) / 100;
      } else {
        discount = Number(reward.reward_value);
      }
      discount = Math.min(discount, Number(total));
      return {
        discount,
        coupon: {
          id: loyaltyResult.redemption.id,
          code: upperCode,
          discount_type: reward.reward_type === RewardType.DISCOUNT_PERCENT ? 'percent' : 'fixed',
          discount_value: reward.reward_value,
          source: 'loyalty',
        },
      };
    }

    // Fallback to regular coupon
    return this.service.validate(upperCode, total, tenantId);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('coupon:read')
  @ApiOperation({ summary: 'List all coupons' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('coupon:read')
  @ApiOperation({ summary: 'Get coupon by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.findById(id, tenantId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('coupon:create')
  @ApiOperation({ summary: 'Create a coupon' })
  create(@Body() dto: CreateCouponDto, @CurrentTenant('id') tenantId: string) {
    return this.service.create(dto, tenantId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('coupon:update')
  @ApiOperation({ summary: 'Update a coupon' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.update(id, dto, tenantId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('coupon:delete')
  @ApiOperation({ summary: 'Delete a coupon' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
