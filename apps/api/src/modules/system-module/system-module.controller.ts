import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe, UseGuards, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../../common/guards';
import { SystemModuleService } from './system-module.service';
import { CreateSystemModuleDto } from './dto/create-system-module.dto';
import { UpdateSystemModuleDto } from './dto/update-system-module.dto';

@ApiTags('Super Admin - System Modules')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
@Controller('super-admin/system-modules')
export class SystemModuleController {
  constructor(private readonly systemModuleService: SystemModuleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a system module' })
  create(@Body() dto: CreateSystemModuleDto) {
    return this.systemModuleService.create(dto);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300000)
  @ApiOperation({ summary: 'List all system modules' })
  findAll() {
    return this.systemModuleService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get system module by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.systemModuleService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a system module' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSystemModuleDto) {
    return this.systemModuleService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a system module' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.systemModuleService.remove(id);
  }
}
