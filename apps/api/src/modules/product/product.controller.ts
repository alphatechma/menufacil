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
import { ProductService } from './product.service';
import { CreateProductDto, CreateExtraGroupDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CurrentTenant, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

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
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
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
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a product' })
  create(@Body() dto: CreateProductDto, @CurrentTenant('id') tenantId: string) {
    return this.productService.create(dto, tenantId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update a product' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.productService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete a product' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.productService.remove(id, tenantId);
  }
}

@ApiTags('Extra Groups')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('extra-groups')
export class ExtraGroupController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List extra groups' })
  findAll(@CurrentTenant('id') tenantId: string) {
    return this.productService.findExtraGroups(tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create an extra group' })
  create(@Body() dto: CreateExtraGroupDto, @CurrentTenant('id') tenantId: string) {
    return this.productService.createExtraGroup(dto, tenantId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete an extra group' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.productService.removeExtraGroup(id, tenantId);
  }
}
