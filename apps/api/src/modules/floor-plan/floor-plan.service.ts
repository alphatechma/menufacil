import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FloorPlan } from './entities/floor-plan.entity';
import { CreateFloorPlanDto } from './dto/create-floor-plan.dto';
import { UpdateFloorPlanDto } from './dto/update-floor-plan.dto';

@Injectable()
export class FloorPlanService {
  constructor(
    @InjectRepository(FloorPlan)
    private readonly floorPlanRepo: Repository<FloorPlan>,
  ) {}

  async findByTenant(tenantId: string): Promise<FloorPlan[]> {
    return this.floorPlanRepo.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'ASC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<FloorPlan> {
    const plan = await this.floorPlanRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!plan) throw new NotFoundException('Mapa do salao nao encontrado');
    return plan;
  }

  async create(dto: CreateFloorPlanDto, tenantId: string): Promise<FloorPlan> {
    const plan = this.floorPlanRepo.create({
      ...dto,
      tenant_id: tenantId,
    });
    return this.floorPlanRepo.save(plan);
  }

  async update(id: string, dto: UpdateFloorPlanDto, tenantId: string): Promise<FloorPlan> {
    const plan = await this.findById(id, tenantId);
    Object.assign(plan, dto);
    return this.floorPlanRepo.save(plan);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const plan = await this.findById(id, tenantId);
    await this.floorPlanRepo.remove(plan);
  }
}
