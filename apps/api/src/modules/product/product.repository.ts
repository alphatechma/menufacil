import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductVariation } from './entities/product-variation.entity';
import { ExtraGroup } from './entities/extra-group.entity';
import { Extra } from './entities/extra.entity';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
    @InjectRepository(ProductVariation)
    private readonly variationRepo: Repository<ProductVariation>,
    @InjectRepository(ExtraGroup)
    private readonly extraGroupRepo: Repository<ExtraGroup>,
    @InjectRepository(Extra)
    private readonly extraRepo: Repository<Extra>,
  ) {}

  create(data: Partial<Product>): Product {
    return this.repo.create(data);
  }

  async save(product: Product): Promise<Product> {
    return this.repo.save(product);
  }

  async findAllByTenant(tenantId: string): Promise<Product[]> {
    return this.repo.find({
      where: { tenant_id: tenantId },
      relations: ['category', 'variations', 'extra_groups', 'extra_groups.extras'],
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findActiveByTenant(tenantId: string): Promise<(Product & { order_count: number })[]> {
    const products = await this.repo.find({
      where: { tenant_id: tenantId, is_active: true },
      relations: ['category', 'variations', 'extra_groups', 'extra_groups.extras'],
      order: { sort_order: 'ASC' },
    });

    // Count how many times each product appears in order_items
    const orderCounts = await this.repo
      .createQueryBuilder('product')
      .select('product.id', 'product_id')
      .addSelect('COALESCE(COUNT(oi.id), 0)', 'order_count')
      .leftJoin('order_items', 'oi', 'oi.product_id = product.id')
      .where('product.tenant_id = :tenantId', { tenantId })
      .andWhere('product.is_active = :isActive', { isActive: true })
      .groupBy('product.id')
      .getRawMany();

    const countMap = new Map(orderCounts.map((r: any) => [r.product_id, parseInt(r.order_count, 10)]));

    return products.map((p) => ({
      ...p,
      order_count: countMap.get(p.id) || 0,
    }));
  }

  async findByCategory(categoryId: string, tenantId: string): Promise<Product[]> {
    return this.repo.find({
      where: { category_id: categoryId, tenant_id: tenantId, is_active: true },
      relations: ['variations', 'extra_groups', 'extra_groups.extras'],
      order: { sort_order: 'ASC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Product | null> {
    return this.repo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['category', 'variations', 'extra_groups', 'extra_groups.extras'],
    });
  }

  async update(id: string, tenantId: string, data: Partial<Product>): Promise<void> {
    await this.repo.update({ id, tenant_id: tenantId }, data as any);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    // Delete related records to avoid FK constraints
    await this.repo.query('DELETE FROM product_recipes WHERE product_id = $1', [id]);
    await this.repo.query('DELETE FROM product_extra_groups WHERE product_id = $1', [id]);
    await this.repo.query('DELETE FROM product_variations WHERE product_id = $1', [id]);
    await this.repo.delete({ id, tenant_id: tenantId });
  }

  async findExtraGroupsByIds(ids: string[]): Promise<ExtraGroup[]> {
    return this.extraGroupRepo.find({ where: { id: In(ids) } });
  }

  // Extra group methods
  createExtraGroup(data: Partial<ExtraGroup>): ExtraGroup {
    return this.extraGroupRepo.create(data);
  }

  async saveExtraGroup(group: ExtraGroup): Promise<ExtraGroup> {
    return this.extraGroupRepo.save(group);
  }

  async findExtraGroupsByTenant(tenantId: string): Promise<ExtraGroup[]> {
    return this.extraGroupRepo.find({
      where: { tenant_id: tenantId },
      relations: ['extras'],
    });
  }

  async findExtraGroupById(id: string, tenantId: string): Promise<ExtraGroup | null> {
    return this.extraGroupRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['extras'],
    });
  }

  async removeExtraGroup(id: string, tenantId: string): Promise<void> {
    // Delete extras first, then product_extra_groups links, then the group itself
    await this.extraRepo.delete({ group_id: id });
    await this.extraGroupRepo.query('DELETE FROM product_extra_groups WHERE extra_group_id = $1', [id]);
    await this.extraGroupRepo.delete({ id, tenant_id: tenantId });
  }

  createExtra(data: Partial<Extra>): Extra {
    return this.extraRepo.create(data);
  }

  async removeExtrasByGroupId(groupId: string): Promise<void> {
    await this.extraRepo.delete({ group_id: groupId });
  }

  // Variation methods
  createVariation(data: Partial<ProductVariation>): ProductVariation {
    return this.variationRepo.create(data);
  }

  async deleteVariationsByProduct(productId: string): Promise<void> {
    await this.variationRepo.delete({ product_id: productId });
  }

  async batchUpdateSortOrder(items: { id: string; sort_order: number }[], tenantId: string): Promise<void> {
    await Promise.all(
      items.map((item) =>
        this.repo.update({ id: item.id, tenant_id: tenantId }, { sort_order: item.sort_order }),
      ),
    );
  }

  async bulkUpdateActive(ids: string[], tenantId: string, isActive: boolean): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Product)
      .set({ is_active: isActive })
      .where('id IN (:...ids)', { ids })
      .andWhere('tenant_id = :tenantId', { tenantId })
      .execute();
  }

  async bulkDelete(ids: string[], tenantId: string): Promise<void> {
    for (const id of ids) {
      await this.remove(id, tenantId);
    }
  }

  async bulkAdjustPrice(ids: string[], tenantId: string, value: number, type: 'percent' | 'fixed'): Promise<void> {
    const products = await this.repo.find({
      where: { tenant_id: tenantId },
    });

    const targetProducts = products.filter((p) => ids.includes(p.id));

    for (const product of targetProducts) {
      let newPrice: number;
      if (type === 'percent') {
        newPrice = Number(product.base_price) * (1 + value / 100);
      } else {
        newPrice = Number(product.base_price) + value;
      }
      newPrice = Math.max(0, Math.round(newPrice * 100) / 100);
      await this.repo.update({ id: product.id, tenant_id: tenantId }, { base_price: newPrice });
    }
  }
}
