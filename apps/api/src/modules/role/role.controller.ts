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
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CurrentTenant, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Roles')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a custom role' })
  create(@Body() dto: CreateRoleDto, @CurrentTenant('id') tenantId: string) {
    return this.roleService.create(dto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List all roles' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.roleService.findAll(tenantId);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List all available permissions' })
  async findPermissions() {
    // Re-use permission repository via service - inject directly
    return this.roleService['permissionRepository'].find({
      relations: ['module'],
      order: { key: 'ASC' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.roleService.findById(id, tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a role' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.roleService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a role' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.roleService.remove(id, tenantId);
  }
}
