import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { TenantRepository } from './tenant.repository';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import { TenantUnit } from '../unit/entities/tenant-unit.entity';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly tenantRepository: TenantRepository,
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
    @InjectRepository(TenantUnit)
    private readonly unitRepo: Repository<TenantUnit>,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.tenantRepository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(`Slug "${dto.slug}" already in use`);
    }

    const tenant = this.tenantRepository.create(dto);
    const saved = await this.tenantRepository.save(tenant);

    // Auto-create headquarters unit
    try {
      const unit = this.unitRepo.create({
        tenant_id: saved.id,
        name: 'Matriz',
        slug: 'matriz',
        address: (dto as any).address || null,
        phone: (dto as any).phone || null,
        is_active: true,
        is_headquarters: true,
      });
      await this.unitRepo.save(unit);
      this.logger.log(`Auto-created headquarters unit for tenant "${saved.slug}"`);
    } catch (err: any) {
      this.logger.warn(`Failed to auto-create headquarters unit: ${err.message}`);
    }

    return saved;
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
