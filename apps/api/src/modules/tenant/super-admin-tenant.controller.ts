import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SuperAdminGuard } from '../../common/guards';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createTenantSchema, updateTenantSchema } from '../../common/schemas/tenant.schema';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { WhatsappInstanceService } from '../whatsapp/services/whatsapp-instance.service';
import { UserRole, IJwtPayload } from '@menufacil/shared';

@ApiTags('Super Admin - Tenants')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
@Controller('super-admin/tenants')
export class SuperAdminTenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly whatsappInstanceService: WhatsappInstanceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all tenants (super-admin)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'is_active', required: false })
  @ApiQuery({ name: 'deleted', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('is_active') is_active?: string,
    @Query('deleted') deleted?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantService.findAllForSuperAdminWithDeleted({
      search,
      is_active,
      deleted,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('check-slug/:slug')
  @ApiOperation({ summary: 'Check if slug is available' })
  async checkSlug(@Param('slug') slug: string) {
    const tenant = await this.tenantService.findBySlugOptional(slug);
    return { available: !tenant, slug };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant details (super-admin)' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.findByIdWithRelations(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a tenant with admin user (super-admin)' })
  create(@Body(new ZodValidationPipe(createTenantSchema)) dto: CreateTenantDto) {
    return this.tenantService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a tenant (super-admin)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updateTenantSchema)) dto: UpdateTenantDto) {
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

  // --- Reset Password ---

  @Patch(':id/reset-password')
  @ApiOperation({ summary: 'Reset tenant admin password' })
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { new_password: string },
  ) {
    await this.tenantService.resetAdminPassword(id, body.new_password);
    return { success: true };
  }

  // --- Update Admin Email ---

  @Patch(':id/update-email')
  @ApiOperation({ summary: 'Update tenant admin email' })
  async updateEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { new_email: string },
  ) {
    await this.tenantService.updateAdminEmail(id, body.new_email);
    return { success: true };
  }

  // --- Session Management ---

  @Post(':id/revoke-all-sessions')
  @ApiOperation({ summary: 'Revoke all user sessions for a tenant' })
  revokeAllSessions(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.revokeAllSessions(id);
  }

  @Post(':id/users/:userId/revoke-session')
  @ApiOperation({ summary: 'Revoke a single user session' })
  async revokeUserSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    await this.tenantService.revokeUserSession(id, userId);
    return { success: true };
  }

  // --- List Tenant Users ---

  @Get(':id/users')
  @ApiOperation({ summary: 'List all users for a tenant' })
  getTenantUsers(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.getTenantUsers(id);
  }

  // --- Impersonation ---

  @Post(':id/impersonate')
  @ApiOperation({ summary: 'Generate impersonation token for tenant admin' })
  async impersonate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { super_admin_id: string },
  ) {
    return this.tenantService.impersonate(id, body.super_admin_id, this.jwtService);
  }

  // --- Soft Delete / Restore ---

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a tenant' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string) {
    await this.tenantService.softDelete(id);
    return { success: true };
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently delete a tenant (hard delete)' })
  async hardDelete(@Param('id', ParseUUIDPipe) id: string) {
    await this.tenantService.hardDelete(id);
    return { success: true };
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted tenant' })
  restore(@Param('id', ParseUUIDPipe) id: string) {
    return this.tenantService.restore(id);
  }

  // --- WhatsApp Management ---

  @Get(':id/whatsapp/status')
  @ApiOperation({ summary: 'Get WhatsApp status for a tenant' })
  getWhatsappStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.whatsappInstanceService.getStatusByTenantId(id);
  }

  @Post(':id/whatsapp/reconnect')
  @ApiOperation({ summary: 'Reconnect WhatsApp for a tenant' })
  async reconnectWhatsapp(@Param('id', ParseUUIDPipe) id: string) {
    const tenant = await this.tenantService.findById(id);
    return this.whatsappInstanceService.connect(id, tenant.slug);
  }

  @Post(':id/whatsapp/disconnect')
  @ApiOperation({ summary: 'Disconnect WhatsApp for a tenant' })
  async disconnectWhatsapp(@Param('id', ParseUUIDPipe) id: string) {
    await this.whatsappInstanceService.disconnect(id);
    return { success: true };
  }
}
