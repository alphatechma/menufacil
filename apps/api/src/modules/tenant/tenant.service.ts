import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { TenantRepository } from './tenant.repository';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.tenantRepository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(`Slug "${dto.slug}" already in use`);
    }

    const tenant = this.tenantRepository.create(dto);
    return this.tenantRepository.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.findAll();
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findBySlugOptional(slug: string): Promise<Tenant | null> {
    return this.tenantRepository.findBySlug(slug);
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    if (dto.slug) {
      const existing = await this.tenantRepository.findBySlug(dto.slug);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Slug "${dto.slug}" already in use`);
      }
    }

    const tenant = await this.tenantRepository.update(id, dto);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.tenantRepository.remove(id);
  }

  // Super-admin methods

  async findAllForSuperAdmin(params: {
    search?: string;
    is_active?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Tenant[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const where: any = {};
    if (params.is_active !== undefined && params.is_active !== '') {
      where.is_active = params.is_active === 'true';
    }
    if (params.search) {
      where.name = ILike(`%${params.search}%`);
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['plan'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findByIdWithRelations(id: string): Promise<Tenant> {
    const tenant = await this.repo.findOne({
      where: { id },
      relations: ['plan', 'plan.modules'],
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async toggleActive(id: string): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.is_active = !tenant.is_active;
    return this.repo.save(tenant);
  }

  async assignPlan(id: string, planId: string): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.plan_id = planId;
    return this.repo.save(tenant);
  }
}
