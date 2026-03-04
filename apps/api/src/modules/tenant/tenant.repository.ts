import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantRepository {
  constructor(
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
  ) {}

  create(dto: CreateTenantDto): Tenant {
    return this.repo.create(dto);
  }

  async save(tenant: Tenant): Promise<Tenant> {
    return this.repo.save(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.repo.find({ where: { is_active: true }, order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant | null> {
    await this.repo.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.repo.update(id, { is_active: false });
  }
}
