import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoryRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  create(data: Partial<Category>): Category {
    return this.repo.create(data);
  }

  async save(category: Category): Promise<Category> {
    return this.repo.save(category);
  }

  async findAllByTenant(tenantId: string): Promise<Category[]> {
    return this.repo.find({
      where: { tenant_id: tenantId },
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findActiveByTenant(tenantId: string): Promise<Category[]> {
    return this.repo.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { sort_order: 'ASC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Category | null> {
    return this.repo.findOne({ where: { id, tenant_id: tenantId } });
  }

  async update(id: string, tenantId: string, data: Partial<Category>): Promise<void> {
    await this.repo.update({ id, tenant_id: tenantId }, data as any);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenant_id: tenantId });
  }
}
