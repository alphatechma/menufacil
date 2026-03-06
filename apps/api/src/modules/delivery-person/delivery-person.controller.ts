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
import { UserRole } from '@menufacil/shared';
import { DeliveryPersonService } from './delivery-person.service';
import { CreateDeliveryPersonDto } from './dto/create-delivery-person.dto';
import { UpdateDeliveryPersonDto } from './dto/update-delivery-person.dto';
import { CurrentTenant, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Delivery Persons')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.KITCHEN)
@Controller('delivery-persons')
export class DeliveryPersonController {
  constructor(private readonly service: DeliveryPersonService) {}

  @Get()
  @ApiOperation({ summary: 'List delivery persons' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery person by ID with orders' })
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.findByIdWithOrders(id, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a delivery person' })
  create(@Body() dto: CreateDeliveryPersonDto, @CurrentTenant('id') tenantId: string) {
    return this.service.create(dto, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a delivery person' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryPersonDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.update(id, dto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a delivery person' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
