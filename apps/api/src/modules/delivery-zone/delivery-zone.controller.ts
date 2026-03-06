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
import { DeliveryZoneService } from './delivery-zone.service';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { CurrentTenant, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Delivery Zones')
@ApiSecurity('tenant-slug')
@Controller('delivery-zones')
export class DeliveryZoneController {
  constructor(private readonly service: DeliveryZoneService) {}

  @Get()
  @ApiOperation({ summary: 'List delivery zones' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get('by-neighborhood')
  @ApiOperation({ summary: 'Find delivery zone by neighborhood name' })
  findByNeighborhood(
    @Query('neighborhood') neighborhood: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.findByNeighborhood(neighborhood, tenantId);
  }

  @Get('calculate')
  @ApiOperation({ summary: 'Calculate delivery fee for coordinates' })
  calculateFee(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.calculateDeliveryFee(lat, lng, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery zone by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.findById(id, tenantId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('delivery:create')
  @ApiOperation({ summary: 'Create a delivery zone' })
  create(@Body() dto: CreateDeliveryZoneDto, @CurrentTenant('id') tenantId: string) {
    return this.service.create(dto, tenantId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('delivery:update')
  @ApiOperation({ summary: 'Update a delivery zone' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryZoneDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.update(id, dto, tenantId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('delivery:delete')
  @ApiOperation({ summary: 'Delete a delivery zone' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
