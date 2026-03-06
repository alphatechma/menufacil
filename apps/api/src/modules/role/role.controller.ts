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
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CurrentTenant, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Roles')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequirePermissions('roles:create')
  @ApiOperation({ summary: 'Create a custom role' })
  create(@Body() dto: CreateRoleDto, @CurrentTenant('id') tenantId: string) {
    return this.roleService.create(dto, tenantId);
  }

  @Get()
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'List all roles' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.roleService.findAll(tenantId);
  }

  @Get('permissions')
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'List all available permissions' })
  async findPermissions() {
    return this.roleService['permissionRepository'].find({
      relations: ['module'],
      order: { key: 'ASC' },
    });
  }

  @Get(':id')
  @RequirePermissions('roles:read')
  @ApiOperation({ summary: 'Get role by ID' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.roleService.findById(id, tenantId);
  }

  @Put(':id')
  @RequirePermissions('roles:update')
  @ApiOperation({ summary: 'Update a role' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.roleService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @RequirePermissions('roles:delete')
  @ApiOperation({ summary: 'Delete a role' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.roleService.remove(id, tenantId);
  }
}
