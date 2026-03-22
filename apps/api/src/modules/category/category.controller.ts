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
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CurrentTenant, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createCategorySchema, updateCategorySchema } from '../../common/schemas/category.schema';

@ApiTags('Categories')
@ApiSecurity('tenant-slug')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all active categories (public)' })
  findActive(@CurrentTenant('id') tenantId: string) {
    return this.categoryService.findActive(tenantId);
  }

  @Get('all')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('category:read')
  @ApiOperation({ summary: 'List all categories (admin)' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.categoryService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.categoryService.findById(id, tenantId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('category:create')
  @ApiOperation({ summary: 'Create a category' })
  create(@Body(new ZodValidationPipe(createCategorySchema)) dto: CreateCategoryDto, @CurrentTenant('id') tenantId: string) {
    return this.categoryService.create(dto, tenantId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('category:update')
  @ApiOperation({ summary: 'Update a category' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) dto: UpdateCategoryDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.categoryService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('category:delete')
  @ApiOperation({ summary: 'Delete a category' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.categoryService.remove(id, tenantId);
  }
}
