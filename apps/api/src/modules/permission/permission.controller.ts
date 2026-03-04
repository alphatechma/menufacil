import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../../common/guards';
import { PermissionService } from './permission.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@ApiTags('Super Admin - Permissions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
@Controller('super-admin/permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a permission' })
  create(@Body() dto: CreatePermissionDto) {
    return this.permissionService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all permissions' })
  @ApiQuery({ name: 'module_id', required: false })
  findAll(@Query('module_id') moduleId?: string) {
    return this.permissionService.findAll(moduleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get permission by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a permission' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePermissionDto) {
    return this.permissionService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a permission' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionService.remove(id);
  }
}
