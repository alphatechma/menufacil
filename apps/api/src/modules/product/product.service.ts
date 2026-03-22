import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { CreateProductDto, CreateExtraGroupDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ReorderProductsDto } from './dto/reorder-products.dto';
import { BulkProductActionDto, BulkProductActionType } from './dto/bulk-product-action.dto';
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
        this.productRepository.createVariation({ name: v.name, description: v.description, price: v.price }),
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
      throw new NotFoundException('Produto nao encontrado');
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
          this.productRepository.createVariation({ name: v.name, description: v.description, price: v.price, product_id: id }),
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

  async bulkAction(tenantId: string, dto: BulkProductActionDto): Promise<{ affected: number }> {
    if (!dto.ids.length) {
      throw new BadRequestException('Nenhum ID de produto informado');
    }

    switch (dto.action) {
      case BulkProductActionType.ACTIVATE:
        await this.productRepository.bulkUpdateActive(dto.ids, tenantId, true);
        return { affected: dto.ids.length };

      case BulkProductActionType.DEACTIVATE:
        await this.productRepository.bulkUpdateActive(dto.ids, tenantId, false);
        return { affected: dto.ids.length };

      case BulkProductActionType.DELETE:
        await this.productRepository.bulkDelete(dto.ids, tenantId);
        return { affected: dto.ids.length };

      case BulkProductActionType.ADJUST_PRICE:
        if (dto.value === undefined || !dto.adjustment_type) {
          throw new BadRequestException('Valor e tipo de ajuste são obrigatórios para ajuste de preço');
        }
        await this.productRepository.bulkAdjustPrice(dto.ids, tenantId, dto.value, dto.adjustment_type);
        return { affected: dto.ids.length };

      default:
        throw new BadRequestException(`Acao em lote desconhecida: ${dto.action}`);
    }
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

  async updateExtraGroup(id: string, dto: CreateExtraGroupDto, tenantId: string): Promise<ExtraGroup> {
    const existing = await this.productRepository.findExtraGroupById(id, tenantId);
    if (!existing) {
      throw new NotFoundException('Grupo de extras nao encontrado');
    }

    // Update group fields
    existing.name = dto.name;
    existing.min_select = dto.min_select ?? 0;
    existing.max_select = dto.max_select ?? 1;
    existing.is_required = dto.is_required ?? false;

    // Replace extras: remove old ones and set new ones
    await this.productRepository.removeExtrasByGroupId(id);
    existing.extras = dto.extras.map((e) =>
      this.productRepository.createExtra({ name: e.name, price: e.price, group_id: id }),
    );

    return this.productRepository.saveExtraGroup(existing);
  }

  async findExtraGroups(tenantId: string): Promise<ExtraGroup[]> {
    return this.productRepository.findExtraGroupsByTenant(tenantId);
  }

  async removeExtraGroup(id: string, tenantId: string): Promise<void> {
    const group = await this.productRepository.findExtraGroupById(id, tenantId);
    if (!group) {
      throw new NotFoundException('Grupo de extras nao encontrado');
    }
    await this.productRepository.removeExtraGroup(id, tenantId);
  }
}
