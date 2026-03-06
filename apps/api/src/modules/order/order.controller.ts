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
import { UserRole } from '@menufacil/shared';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AssignDeliveryPersonDto } from './dto/assign-delivery-person.dto';
import { CurrentTenant, CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Orders')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order (customer)' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser('id') userId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.orderService.create(dto, userId, tenantId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'List all orders (admin)' })
  findByTenant(@CurrentTenant('id') tenantId: string) {
    return this.orderService.findByTenant(tenantId);
  }

  @Get('stats/dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
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
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Get order performance stats (avg times, ranking)' })
  getPerformanceStats(
    @Query('days') days: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.orderService.getPerformanceStats(tenantId, days ? parseInt(days, 10) : 7);
  }

  @Get('my')
  @ApiOperation({ summary: 'List my orders (customer)' })
  findMyOrders(@CurrentUser('id') userId: string, @CurrentTenant('id') tenantId: string) {
    return this.orderService.findByCustomer(userId, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.orderService.findById(id, tenantId);
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.KITCHEN)
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.orderService.updateStatus(id, dto.status, tenantId, dto.delivery_person_id);
  }

  @Put(':id/delivery-person')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Assign delivery person to order' })
  assignDeliveryPerson(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDeliveryPersonDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.orderService.assignDeliveryPerson(id, dto.delivery_person_id, tenantId);
  }
}
