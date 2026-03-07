import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { UnitService } from './unit.service';

@Controller('public/units')
export class UnitPublicController {
  constructor(
    private readonly unitService: UnitService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  @Get(':tenantSlug')
  async findByTenantSlug(@Param('tenantSlug') slug: string) {
    const tenant = await this.tenantRepo.findOne({
      where: { slug, is_active: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.unitService.findActiveByTenant(tenant.id);
  }
}
