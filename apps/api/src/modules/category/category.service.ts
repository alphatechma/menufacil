import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryRepository } from './category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async create(dto: CreateCategoryDto, tenantId: string): Promise<Category> {
    const category = this.categoryRepository.create({ ...dto, tenant_id: tenantId });
    return this.categoryRepository.save(category);
  }

  async findAll(tenantId: string): Promise<Category[]> {
    return this.categoryRepository.findAllByTenant(tenantId);
  }

  async findActive(tenantId: string): Promise<Category[]> {
    return this.categoryRepository.findActiveByTenant(tenantId);
  }

  async findById(id: string, tenantId: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id, tenantId);
    if (!category) {
      throw new NotFoundException('Categoria nao encontrada');
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, tenantId: string): Promise<Category> {
    await this.findById(id, tenantId);
    await this.categoryRepository.update(id, tenantId, dto);
    return this.findById(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findById(id, tenantId);
    await this.categoryRepository.remove(id, tenantId);
  }
}
