import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { PromotionService } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { EvaluateCartDto } from './dto/evaluate-cart.dto';
import { CurrentTenant, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Promotions')
@ApiSecurity('tenant-slug')
@Controller('promotions')
export class PromotionController {
  constructor(private readonly service: PromotionService) {}

  // --- Admin endpoints ---

  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('coupon:read')
  @ApiOperation({ summary: 'List all promotions (admin)' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('coupon:create')
  @ApiOperation({ summary: 'Create a promotion' })
  create(@Body() dto: CreatePromotionDto, @CurrentTenant('id') tenantId: string) {
    return this.service.create(tenantId, dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('coupon:update')
  @ApiOperation({ summary: 'Update a promotion' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromotionDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('coupon:delete')
  @ApiOperation({ summary: 'Delete a promotion' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.remove(tenantId, id);
  }

  // --- Public / customer endpoints ---

  @Get('active')
  @ApiOperation({ summary: 'List active promotions for storefront' })
  getActive(@CurrentTenant('id') tenantId: string) {
    return this.service.getActivePromotions(tenantId);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate cart items against active promotions' })
  evaluateCart(
    @Body() dto: EvaluateCartDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.evaluateCart(tenantId, dto.items);
  }
}
