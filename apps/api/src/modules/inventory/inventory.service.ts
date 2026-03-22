import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { ProductRecipe } from './entities/product-recipe.entity';
import { CreateInventoryItemDto, UpdateInventoryItemDto, CreateStockMovementDto, CreateProductRecipeDto } from './dto/inventory.dto';
import { Order } from '../order/entities/order.entity';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(InventoryItem) private readonly itemRepo: Repository<InventoryItem>,
    @InjectRepository(StockMovement) private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(ProductRecipe) private readonly recipeRepo: Repository<ProductRecipe>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
  ) {}

  // ── Items ──

  async findAllItems(tenantId: string): Promise<InventoryItem[]> {
    return this.itemRepo.find({
      where: { tenant_id: tenantId },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async findItem(id: string, tenantId: string): Promise<InventoryItem> {
    const item = await this.itemRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!item) throw new NotFoundException('Insumo nao encontrado');
    return item;
  }

  async createItem(tenantId: string, dto: CreateInventoryItemDto): Promise<InventoryItem> {
    const item = this.itemRepo.create({ ...dto, tenant_id: tenantId });
    return this.itemRepo.save(item);
  }

  async updateItem(id: string, tenantId: string, dto: UpdateInventoryItemDto): Promise<InventoryItem> {
    await this.itemRepo.update({ id, tenant_id: tenantId }, dto);
    return this.findItem(id, tenantId);
  }

  async deleteItem(id: string, tenantId: string): Promise<void> {
    await this.movementRepo.delete({ item_id: id, tenant_id: tenantId });
    await this.recipeRepo.delete({ item_id: id, tenant_id: tenantId });
    await this.itemRepo.delete({ id, tenant_id: tenantId });
  }

  async getLowStockItems(tenantId: string): Promise<InventoryItem[]> {
    return this.itemRepo
      .createQueryBuilder('item')
      .where('item.tenant_id = :tenantId', { tenantId })
      .andWhere('item.is_active = true')
      .andWhere('item.min_stock > 0')
      .andWhere('item.current_stock <= item.min_stock')
      .orderBy('item.current_stock', 'ASC')
      .getMany();
  }

  // ── Movements ──

  async findMovements(tenantId: string, itemId?: string): Promise<StockMovement[]> {
    const where: any = { tenant_id: tenantId };
    if (itemId) where.item_id = itemId;
    return this.movementRepo.find({
      where,
      relations: ['item'],
      order: { created_at: 'DESC' },
      take: 200,
    });
  }

  async createMovement(tenantId: string, userId: string, dto: CreateStockMovementDto): Promise<StockMovement> {
    const item = await this.findItem(dto.item_id, tenantId);

    // Validate type
    if (!['entry', 'exit', 'adjustment', 'production'].includes(dto.type)) {
      throw new BadRequestException('Tipo de movimentacao invalido');
    }

    // Update stock
    let newStock = Number(item.current_stock);
    if (dto.type === 'entry') {
      newStock += dto.quantity;
    } else if (dto.type === 'exit' || dto.type === 'production') {
      newStock -= dto.quantity;
      if (newStock < 0) newStock = 0;
    } else if (dto.type === 'adjustment') {
      newStock = dto.quantity; // adjustment sets the absolute value
    }

    // Update cost price on entry if provided
    if (dto.type === 'entry' && dto.unit_cost && dto.unit_cost > 0) {
      item.cost_price = dto.unit_cost;
    }

    item.current_stock = newStock;
    await this.itemRepo.save(item);

    const movement = this.movementRepo.create({
      ...dto,
      tenant_id: tenantId,
      created_by: userId,
      unit_cost: dto.unit_cost || item.cost_price,
    });
    return this.movementRepo.save(movement);
  }

  // Deduct stock when an order is placed (based on product recipes)
  async deductStockForOrder(tenantId: string, items: { product_id: string; quantity: number }[]): Promise<void> {
    for (const orderItem of items) {
      const recipes = await this.recipeRepo.find({
        where: { tenant_id: tenantId, product_id: orderItem.product_id },
      });

      for (const recipe of recipes) {
        const deduction = Number(recipe.quantity) * orderItem.quantity;
        const inventoryItem = await this.itemRepo.findOne({ where: { id: recipe.item_id, tenant_id: tenantId } });
        if (inventoryItem) {
          inventoryItem.current_stock = Math.max(0, Number(inventoryItem.current_stock) - deduction);
          await this.itemRepo.save(inventoryItem);

          await this.movementRepo.save(this.movementRepo.create({
            tenant_id: tenantId,
            item_id: recipe.item_id,
            type: 'production',
            quantity: deduction,
            unit_cost: inventoryItem.cost_price,
            reason: 'Baixa automatica por venda',
            reference: `Pedido - ${orderItem.product_id.slice(0, 8)}`,
          }));
        }
      }
    }
  }

  // ── Recipes (Ficha Tecnica) ──

  async findRecipesByProduct(tenantId: string, productId: string): Promise<ProductRecipe[]> {
    return this.recipeRepo.find({
      where: { tenant_id: tenantId, product_id: productId },
      relations: ['item'],
    });
  }

  async setRecipe(tenantId: string, dto: CreateProductRecipeDto): Promise<ProductRecipe> {
    // Upsert: if recipe already exists for this product+item, update quantity
    const existing = await this.recipeRepo.findOne({
      where: { tenant_id: tenantId, product_id: dto.product_id, item_id: dto.item_id },
    });
    if (existing) {
      existing.quantity = dto.quantity;
      return this.recipeRepo.save(existing);
    }
    return this.recipeRepo.save(this.recipeRepo.create({ ...dto, tenant_id: tenantId }));
  }

  async removeRecipe(id: string, tenantId: string): Promise<void> {
    await this.recipeRepo.delete({ id, tenant_id: tenantId });
  }

  async getProductCost(tenantId: string, productId: string): Promise<number> {
    const recipes = await this.findRecipesByProduct(tenantId, productId);
    return recipes.reduce((sum, r) => sum + Number(r.quantity) * Number(r.item?.cost_price || 0), 0);
  }

  // ── Auto-deduct stock when order is confirmed ──

  async autoDeductStock(orderId: string, tenantId: string): Promise<void> {
    try {
      const order = await this.orderRepo.findOne({
        where: { id: orderId, tenant_id: tenantId },
        relations: ['items'],
      });
      if (!order || !order.items?.length) return;

      const items = order.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }));

      await this.deductStockForOrder(tenantId, items);
      this.logger.log(`Auto-deducted stock for order ${order.order_number}`);
    } catch (err) {
      this.logger.warn(`Failed to auto-deduct stock for order ${orderId}: ${err.message}`);
    }
  }

  // ── Reorder Suggestions ──

  async getReorderSuggestions(tenantId: string): Promise<any[]> {
    // Get items below min_stock
    const lowStockItems = await this.getLowStockItems(tenantId);
    if (!lowStockItems.length) return [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const suggestions = [];

    for (const item of lowStockItems) {
      // Calculate avg daily consumption from last 30 days of exit/production movements
      const movements = await this.movementRepo.find({
        where: {
          tenant_id: tenantId,
          item_id: item.id,
          created_at: MoreThanOrEqual(thirtyDaysAgo),
        },
      });

      const totalConsumed = movements
        .filter((m) => m.type === 'exit' || m.type === 'production')
        .reduce((sum, m) => sum + Number(m.quantity), 0);

      const avgDailyConsumption = totalConsumed / 30;
      const deficit = Math.max(0, Number(item.min_stock) - Number(item.current_stock));
      const suggestedReorder = Math.ceil(avgDailyConsumption * 7); // 7-day supply

      suggestions.push({
        id: item.id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        category: item.category,
        supplier: item.supplier,
        current_stock: Number(item.current_stock),
        min_stock: Number(item.min_stock),
        deficit,
        avg_daily_consumption: Math.round(avgDailyConsumption * 100) / 100,
        suggested_reorder: Math.max(suggestedReorder, deficit),
        cost_price: Number(item.cost_price),
        estimated_cost: Math.round(Math.max(suggestedReorder, deficit) * Number(item.cost_price) * 100) / 100,
      });
    }

    return suggestions.sort((a, b) => b.deficit - a.deficit);
  }
}
