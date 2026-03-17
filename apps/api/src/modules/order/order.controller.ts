import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AssignDeliveryPersonDto } from './dto/assign-delivery-person.dto';
import { CurrentTenant, CurrentUnit, CurrentUser, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Orders')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('order:create')
  @ApiOperation({ summary: 'Create a new order (customer)' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser('id') userId: string,
    @CurrentTenant('id') tenantId: string,
    @CurrentUnit() unitId: string | null,
  ) {
    return this.orderService.create(dto, userId, tenantId, unitId);
  }

  @Post('admin')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('order:create')
  @ApiOperation({ summary: 'Create order from admin POS (customer optional)' })
  createFromAdmin(
    @Body() dto: CreateOrderDto,
    @CurrentTenant('id') tenantId: string,
    @CurrentUnit() unitId: string | null,
  ) {
    return this.orderService.createFromAdmin(dto, tenantId, unitId);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('order:read')
  @ApiOperation({ summary: 'List all orders (admin)' })
  findByTenant(@CurrentTenant('id') tenantId: string, @CurrentUnit() unitId: string | null) {
    return this.orderService.findByTenant(tenantId, unitId);
  }

  @Get('stats/dashboard')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('order:read')
  @ApiOperation({ summary: 'Get dashboard/report data with real aggregated data' })
  getDashboard(
    @Query('since') since: string,
    @Query('until') until: string,
    @Query('status') status: string,
    @Query('payment_method') paymentMethod: string,
    @Query('delivery_person_id') deliveryPersonId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const now = new Date();
    const defaultSince = new Date(now);
    defaultSince.setDate(now.getDate() - 7);
    return this.orderService.getDashboard(
      tenantId,
      since || defaultSince.toISOString().split('T')[0],
      until || now.toISOString().split('T')[0],
      {
        status: status || undefined,
        payment_method: paymentMethod || undefined,
        delivery_person_id: deliveryPersonId || undefined,
      },
    );
  }

  @Get('stats/performance')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('order:read')
  @ApiOperation({ summary: 'Get order performance stats (avg times, ranking)' })
  getPerformanceStats(
    @Query('days') days: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.orderService.getPerformanceStats(tenantId, days ? parseInt(days, 10) : 7);
  }

  @Get('cash-register/current')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('order:read')
  @ApiOperation({ summary: 'Get current open cash register' })
  getCashRegister(@CurrentTenant('id') tenantId: string) {
    return this.orderService.getOpenCashRegister(tenantId);
  }

  @Get('my')
  @ApiOperation({ summary: 'List my orders (customer)' })
  findMyOrders(@CurrentUser('id') userId: string, @CurrentTenant('id') tenantId: string) {
    return this.orderService.findByCustomer(userId, tenantId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order (customer, time-limited)' })
  cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.orderService.cancelByCustomer(id, userId, tenantId);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('order:read')
  @ApiOperation({ summary: 'Get order by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.orderService.findById(id, tenantId);
  }

  @Put(':id/status')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('order:update')
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.orderService.updateStatus(id, dto.status, tenantId, dto.delivery_person_id);
  }

  @Put(':id/delivery-person')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('order:update')
  @ApiOperation({ summary: 'Assign delivery person to order' })
  assignDeliveryPerson(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDeliveryPersonDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.orderService.assignDeliveryPerson(id, dto.delivery_person_id, tenantId);
  }

  // ── Cash Register ──

  @Post('cash-register/open')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('order:create')
  @ApiOperation({ summary: 'Open cash register' })
  openCashRegister(
    @Body() body: { opening_balance: number },
    @CurrentUser('id') userId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.orderService.openCashRegister(tenantId, userId, body.opening_balance || 0);
  }

  @Post('cash-register/close')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('order:create')
  @ApiOperation({ summary: 'Close cash register' })
  closeCashRegister(
    @Body() body: { closing_balance: number; notes?: string },
    @CurrentUser('id') userId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.orderService.closeCashRegister(tenantId, userId, body.closing_balance || 0, body.notes);
  }
}
