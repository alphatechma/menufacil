import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../common/guards';
import { CurrentTenant, RequirePermissions } from '../../common/decorators';
import { UnitService } from './unit.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Controller('units')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @Get()
  @RequirePermissions('unit:read')
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.unitService.findAll(tenantId);
  }

  @Get(':id')
  @RequirePermissions('unit:read')
  findOne(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.unitService.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions('unit:create')
  create(@CurrentTenant('id') tenantId: string, @Body() dto: CreateUnitDto) {
    return this.unitService.create(tenantId, dto);
  }

  @Put(':id')
  @RequirePermissions('unit:update')
  update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.unitService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('unit:delete')
  remove(@CurrentTenant('id') tenantId: string, @Param('id') id: string) {
    return this.unitService.remove(tenantId, id);
  }
}
