import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantUnit } from './entities/tenant-unit.entity';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

@Injectable()
export class UnitService {
  constructor(
    @InjectRepository(TenantUnit)
    private readonly unitRepo: Repository<TenantUnit>,
  ) {}

  async findAll(tenantId: string): Promise<TenantUnit[]> {
    return this.unitRepo.find({
      where: { tenant_id: tenantId },
      order: { is_headquarters: 'DESC', name: 'ASC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<TenantUnit> {
    const unit = await this.unitRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  async create(tenantId: string, dto: CreateUnitDto): Promise<TenantUnit> {
    const existing = await this.unitRepo.findOne({
      where: { tenant_id: tenantId, slug: dto.slug },
    });
    if (existing)
      throw new BadRequestException('Slug already in use for this tenant');

    const count = await this.unitRepo.count({
      where: { tenant_id: tenantId },
    });
    const unit = this.unitRepo.create({
      ...dto,
      tenant_id: tenantId,
      is_headquarters: count === 0,
    });
    return this.unitRepo.save(unit);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateUnitDto,
  ): Promise<TenantUnit> {
    const unit = await this.findOne(tenantId, id);
    if (dto.slug && dto.slug !== unit.slug) {
      const existing = await this.unitRepo.findOne({
        where: { tenant_id: tenantId, slug: dto.slug },
      });
      if (existing)
        throw new BadRequestException('Slug already in use for this tenant');
    }
    Object.assign(unit, dto);
    return this.unitRepo.save(unit);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const unit = await this.findOne(tenantId, id);
    unit.is_active = false;
    await this.unitRepo.save(unit);
  }

  async findActiveByTenant(tenantId: string): Promise<TenantUnit[]> {
    return this.unitRepo.find({
      where: { tenant_id: tenantId, is_active: true },
      order: { is_headquarters: 'DESC', name: 'ASC' },
    });
  }
}
