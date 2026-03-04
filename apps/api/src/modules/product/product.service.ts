import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { CreateProductDto, CreateExtraGroupDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ReorderProductsDto } from './dto/reorder-products.dto';
import { Product } from './entities/product.entity';
import { ExtraGroup } from './entities/extra-group.entity';

@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async create(dto: CreateProductDto, tenantId: string): Promise<Product> {
    const { variations, extra_group_ids, ...productData } = dto;

    const product = this.productRepository.create({
      ...productData,
      tenant_id: tenantId,
    });

    if (variations?.length) {
      product.variations = variations.map((v) =>
        this.productRepository.createVariation({ name: v.name, price: v.price }),
      );
    }

    if (extra_group_ids?.length) {
      product.extra_groups = await this.productRepository.findExtraGroupsByIds(extra_group_ids);
    }

    const saved = await this.productRepository.save(product);
    return this.findById(saved.id, tenantId);
  }

  async findAll(tenantId: string): Promise<Product[]> {
    return this.productRepository.findAllByTenant(tenantId);
  }

  async findActive(tenantId: string): Promise<Product[]> {
    return this.productRepository.findActiveByTenant(tenantId);
  }

  async findByCategory(categoryId: string, tenantId: string): Promise<Product[]> {
    return this.productRepository.findByCategory(categoryId, tenantId);
  }

  async findById(id: string, tenantId: string): Promise<Product> {
    const product = await this.productRepository.findById(id, tenantId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto, tenantId: string): Promise<Product> {
    await this.findById(id, tenantId);
    const { variations, extra_group_ids, ...productData } = dto;

    if (Object.keys(productData).length > 0) {
      await this.productRepository.update(id, tenantId, productData);
    }

    if (variations !== undefined) {
      await this.productRepository.deleteVariationsByProduct(id);
      if (variations.length > 0) {
        const product = await this.findById(id, tenantId);
        product.variations = variations.map((v) =>
          this.productRepository.createVariation({ name: v.name, price: v.price, product_id: id }),
        );
        await this.productRepository.save(product);
      }
    }

    if (extra_group_ids) {
      const product = await this.findById(id, tenantId);
      product.extra_groups = await this.productRepository.findExtraGroupsByIds(extra_group_ids);
      await this.productRepository.save(product);
    }

    return this.findById(id, tenantId);
  }

  async reorder(dto: ReorderProductsDto, tenantId: string): Promise<void> {
    await this.productRepository.batchUpdateSortOrder(dto.items, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findById(id, tenantId);
    await this.productRepository.remove(id, tenantId);
  }

  // Extra Groups
  async createExtraGroup(dto: CreateExtraGroupDto, tenantId: string): Promise<ExtraGroup> {
    const group = this.productRepository.createExtraGroup({
      name: dto.name,
      min_select: dto.min_select || 0,
      max_select: dto.max_select || 1,
      is_required: dto.is_required || false,
      tenant_id: tenantId,
      extras: dto.extras as any,
    });

    return this.productRepository.saveExtraGroup(group);
  }

  async findExtraGroups(tenantId: string): Promise<ExtraGroup[]> {
    return this.productRepository.findExtraGroupsByTenant(tenantId);
  }

  async removeExtraGroup(id: string, tenantId: string): Promise<void> {
    const group = await this.productRepository.findExtraGroupById(id, tenantId);
    if (!group) {
      throw new NotFoundException('Extra group not found');
    }
    await this.productRepository.removeExtraGroup(id, tenantId);
  }
}
