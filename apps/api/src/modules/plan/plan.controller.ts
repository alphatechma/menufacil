import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../../common/guards';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@ApiTags('Super Admin - Plans')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
@Controller('super-admin/plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  @ApiOperation({ summary: 'Create a plan' })
  create(@Body() dto: CreatePlanDto) {
    return this.planService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all plans' })
  findAll() {
    return this.planService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.planService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a plan' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto) {
    return this.planService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a plan' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.planService.remove(id);
  }

  @Put(':id/modules')
  @ApiOperation({ summary: 'Assign modules to a plan' })
  assignModules(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { module_ids: string[] },
  ) {
    return this.planService.assignModules(id, body.module_ids);
  }
}
