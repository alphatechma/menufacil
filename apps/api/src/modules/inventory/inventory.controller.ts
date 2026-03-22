import { Controller, Get, Post, Put, Delete, Body, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto, UpdateInventoryItemDto, CreateStockMovementDto, CreateProductRecipeDto } from './dto/inventory.dto';
import { CurrentTenant, CurrentUser, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Inventory')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ── Items ──

  @Get('items')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('product:read')
  @ApiOperation({ summary: 'List all inventory items' })
  findAllItems(@CurrentTenant('id') tenantId: string) {
    return this.inventoryService.findAllItems(tenantId);
  }

  @Get('items/low-stock')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('product:read')
  @ApiOperation({ summary: 'List items with low stock' })
  getLowStock(@CurrentTenant('id') tenantId: string) {
    return this.inventoryService.getLowStockItems(tenantId);
  }

  @Get('items/reorder-suggestions')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('product:read')
  @ApiOperation({ summary: 'Get reorder suggestions for low stock items' })
  getReorderSuggestions(@CurrentTenant('id') tenantId: string) {
    return this.inventoryService.getReorderSuggestions(tenantId);
  }

  @Get('items/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('product:read')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  findItem(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.inventoryService.findItem(id, tenantId);
  }

  @Post('items')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('product:create')
  @ApiOperation({ summary: 'Create inventory item' })
  createItem(@Body() dto: CreateInventoryItemDto, @CurrentTenant('id') tenantId: string) {
    return this.inventoryService.createItem(tenantId, dto);
  }

  @Put('items/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('product:update')
  @ApiOperation({ summary: 'Update inventory item' })
  updateItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateInventoryItemDto, @CurrentTenant('id') tenantId: string) {
    return this.inventoryService.updateItem(id, tenantId, dto);
  }

  @Delete('items/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('product:delete')
  @ApiOperation({ summary: 'Delete inventory item' })
  deleteItem(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.inventoryService.deleteItem(id, tenantId);
  }

  // ── Movements ──

  @Get('movements')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('product:read')
  @ApiOperation({ summary: 'List stock movements' })
  findMovements(@CurrentTenant('id') tenantId: string, @Query('item_id') itemId?: string) {
    return this.inventoryService.findMovements(tenantId, itemId);
  }

  @Post('movements')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('product:create')
  @ApiOperation({ summary: 'Create stock movement (entry/exit/adjustment)' })
  createMovement(@Body() dto: CreateStockMovementDto, @CurrentUser('id') userId: string, @CurrentTenant('id') tenantId: string) {
    return this.inventoryService.createMovement(tenantId, userId, dto);
  }

  // ── Recipes (Ficha Tecnica) ──

  @Get('recipes/:productId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('product:read')
  @ApiOperation({ summary: 'Get product recipe (ficha tecnica)' })
  findRecipes(@Param('productId', ParseUUIDPipe) productId: string, @CurrentTenant('id') tenantId: string) {
    return this.inventoryService.findRecipesByProduct(tenantId, productId);
  }

  @Post('recipes')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('product:create')
  @ApiOperation({ summary: 'Add/update recipe ingredient' })
  setRecipe(@Body() dto: CreateProductRecipeDto, @CurrentTenant('id') tenantId: string) {
    return this.inventoryService.setRecipe(tenantId, dto);
  }

  @Delete('recipes/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('product:delete')
  @ApiOperation({ summary: 'Remove recipe ingredient' })
  removeRecipe(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant('id') tenantId: string) {
    return this.inventoryService.removeRecipe(id, tenantId);
  }

  @Get('recipes/:productId/cost')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('product:read')
  @ApiOperation({ summary: 'Calculate product cost from recipe' })
  getProductCost(@Param('productId', ParseUUIDPipe) productId: string, @CurrentTenant('id') tenantId: string) {
    return this.inventoryService.getProductCost(tenantId, productId);
  }
}
