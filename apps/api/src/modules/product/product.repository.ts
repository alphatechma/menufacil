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

  async findActiveByTenant(tenantId: string): Promise<Product[]> {
    return this.repo.find({
      where: { tenant_id: tenantId, is_active: true },
      relations: ['category', 'variations', 'extra_groups', 'extra_groups.extras'],
      order: { sort_order: 'ASC' },
    });
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
}
