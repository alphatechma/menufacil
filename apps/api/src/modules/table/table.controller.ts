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
import { TableService } from './table.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { TableStatus } from './entities/table.entity';
import { CurrentTenant, CurrentUnit, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Tables')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@Controller('tables')
export class TableController {
  constructor(private readonly service: TableService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('table:read')
  @ApiOperation({ summary: 'List all tables' })
  findAll(@CurrentTenant('id') tenantId: string, @CurrentUnit() unitId: string | null) {
    return this.service.findAll(tenantId, unitId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('table:read')
  @ApiOperation({ summary: 'Get table by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.findById(id, tenantId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('table:create')
  @ApiOperation({ summary: 'Create a table' })
  create(@Body() dto: CreateTableDto, @CurrentTenant('id') tenantId: string, @CurrentUnit() unitId: string | null) {
    return this.service.create(dto, tenantId, unitId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('table:update')
  @ApiOperation({ summary: 'Update a table' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTableDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.update(id, dto, tenantId);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('table:update')
  @ApiOperation({ summary: 'Update table status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: TableStatus,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.updateStatus(id, status, tenantId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('table:delete')
  @ApiOperation({ summary: 'Delete a table' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.service.delete(id, tenantId);
  }

  @Get(':id/qr')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('table:read')
  @ApiOperation({ summary: 'Get QR code data for a table' })
  getQrCode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant('id') tenantId: string,
    @CurrentTenant('slug') slug: string,
  ) {
    return this.service.getQrCodeData(id, tenantId, slug);
  }
}
