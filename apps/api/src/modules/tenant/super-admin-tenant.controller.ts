import { Controller, Get, Post, Put, Patch, Body, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../../common/guards';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('Super Admin - Tenants')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
@Controller('super-admin/tenants')
export class SuperAdminTenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants (super-admin)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'is_active', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('is_active') is_active?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantService.findAllForSuperAdmin({
      search,
      is_active,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant details (super-admin)' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.findByIdWithRelations(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a tenant (super-admin)' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tenant (super-admin)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle tenant active status' })
  toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.toggleActive(id);
  }

  @Patch(':id/plan')
  @ApiOperation({ summary: 'Assign plan to tenant' })
  assignPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { plan_id: string },
  ) {
    return this.tenantService.assignPlan(id, body.plan_id);
  }
}
