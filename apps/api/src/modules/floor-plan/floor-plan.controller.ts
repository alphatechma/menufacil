import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { FloorPlanService } from './floor-plan.service';
import { CreateFloorPlanDto } from './dto/create-floor-plan.dto';
import { UpdateFloorPlanDto } from './dto/update-floor-plan.dto';
import { CurrentTenant, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Floor Plans')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@Controller('floor-plans')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class FloorPlanController {
  constructor(private readonly service: FloorPlanService) {}

  @Get()
  @RequirePermissions('floor_plan:read')
  @ApiOperation({ summary: 'List floor plans for tenant' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.service.findByTenant(tenantId);
  }

  @Get(':id')
  @RequirePermissions('floor_plan:read')
  @ApiOperation({ summary: 'Get floor plan by ID' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.findById(id, tenantId);
  }

  @Post()
  @RequirePermissions('floor_plan:update')
  @ApiOperation({ summary: 'Create a floor plan' })
  create(
    @Body() dto: CreateFloorPlanDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.create(dto, tenantId);
  }

  @Patch(':id')
  @RequirePermissions('floor_plan:update')
  @ApiOperation({ summary: 'Update a floor plan' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFloorPlanDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.update(id, dto, tenantId);
  }

  @Delete(':id')
  @RequirePermissions('floor_plan:update')
  @ApiOperation({ summary: 'Delete a floor plan' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.delete(id, tenantId);
  }
}
