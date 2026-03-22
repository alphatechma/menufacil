import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { AbandonedCartService } from './abandoned-cart.service';
import { CurrentTenant, CurrentUser, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Abandoned Carts')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('abandoned-carts')
export class AbandonedCartController {
  constructor(private readonly service: AbandonedCartService) {}

  @Post('save')
  @ApiOperation({ summary: 'Save current cart (customer)' })
  saveCart(
    @Body() dto: { items: any[]; total: number },
    @CurrentUser('id') customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.saveCart(customerId, tenantId, dto.items, dto.total);
  }

  @Get('recover')
  @ApiOperation({ summary: 'Get recoverable cart (customer)' })
  getRecoverableCart(
    @CurrentUser('id') customerId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.getRecoverableCart(customerId, tenantId);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'List abandoned carts (admin)' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.service.getAbandonedCarts(tenantId);
  }

  @Get('stats')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('customer:read')
  @ApiOperation({ summary: 'Get abandoned cart stats (admin)' })
  getStats(@CurrentTenant('id') tenantId: string) {
    return this.service.getStats(tenantId);
  }
}
