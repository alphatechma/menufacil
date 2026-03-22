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
import { ProductService } from './product.service';
import { CreateProductDto, CreateExtraGroupDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ReorderProductsDto } from './dto/reorder-products.dto';
import { BulkProductActionDto } from './dto/bulk-product-action.dto';
import { CurrentTenant, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Products')
@ApiSecurity('tenant-slug')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'List active products (public)' })
  findActive(@CurrentTenant('id') tenantId: string) {
    return this.productService.findActive(tenantId);
  }

  @Get('all')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('product:read')
  @ApiOperation({ summary: 'List all products (admin)' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.productService.findAll(tenantId);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'List products by category' })
  findByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.productService.findByCategory(categoryId, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.productService.findById(id, tenantId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('product:create')
  @ApiOperation({ summary: 'Create a product' })
  create(@Body() dto: CreateProductDto, @CurrentTenant('id') tenantId: string) {
    return this.productService.create(dto, tenantId);
  }

  @Put('bulk')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('product:update')
  @ApiOperation({ summary: 'Bulk product action (activate, deactivate, delete, adjust_price)' })
  bulkAction(@Body() dto: BulkProductActionDto, @CurrentTenant('id') tenantId: string) {
    return this.productService.bulkAction(tenantId, dto);
  }

  @Put('reorder')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('product:update')
  @ApiOperation({ summary: 'Reorder products' })
  reorder(@Body() dto: ReorderProductsDto, @CurrentTenant('id') tenantId: string) {
    return this.productService.reorder(dto, tenantId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('product:update')
  @ApiOperation({ summary: 'Update a product' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.productService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiBearerAuth()
  @RequirePermissions('product:delete')
  @ApiOperation({ summary: 'Delete a product' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.productService.remove(id, tenantId);
  }
}

@ApiTags('Extra Groups')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('extra-groups')
export class ExtraGroupController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @RequirePermissions('product:read')
  @ApiOperation({ summary: 'List extra groups' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.productService.findExtraGroups(tenantId);
  }

  @Post()
  @RequirePermissions('product:create')
  @ApiOperation({ summary: 'Create an extra group' })
  create(@Body() dto: CreateExtraGroupDto, @CurrentTenant('id') tenantId: string) {
    return this.productService.createExtraGroup(dto, tenantId);
  }

  @Put(':id')
  @RequirePermissions('product:update')
  @ApiOperation({ summary: 'Update an extra group' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateExtraGroupDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.productService.updateExtraGroup(id, dto, tenantId);
  }

  @Delete(':id')
  @RequirePermissions('product:delete')
  @ApiOperation({ summary: 'Delete an extra group' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.productService.removeExtraGroup(id, tenantId);
  }
}
