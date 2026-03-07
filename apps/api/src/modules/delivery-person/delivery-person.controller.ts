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
import { DeliveryPersonService } from './delivery-person.service';
import { CreateDeliveryPersonDto } from './dto/create-delivery-person.dto';
import { UpdateDeliveryPersonDto } from './dto/update-delivery-person.dto';
import { CurrentTenant, CurrentUnit, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Delivery Persons')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@Controller('delivery-persons')
export class DeliveryPersonController {
  constructor(private readonly service: DeliveryPersonService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('delivery:read')
  @ApiOperation({ summary: 'List delivery persons' })
  findAll(@CurrentTenant('id') tenantId: string, @CurrentUnit() unitId: string | null) {
    return this.service.findAll(tenantId, unitId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('delivery:read')
  @ApiOperation({ summary: 'Get delivery person by ID with orders' })
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.findByIdWithOrders(id, tenantId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('delivery:create')
  @ApiOperation({ summary: 'Create a delivery person' })
  create(@Body() dto: CreateDeliveryPersonDto, @CurrentTenant('id') tenantId: string, @CurrentUnit() unitId: string | null) {
    return this.service.create(dto, tenantId, unitId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('delivery:update')
  @ApiOperation({ summary: 'Update a delivery person' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryPersonDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.update(id, dto, tenantId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('delivery:delete')
  @ApiOperation({ summary: 'Delete a delivery person' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
