import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { SystemModule } from '../system-module/entities/system-module.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(SystemModule)
    private readonly moduleRepository: Repository<SystemModule>,
  ) {}

  async create(dto: CreatePlanDto): Promise<Plan> {
    const plan = this.planRepository.create(dto);
    return this.planRepository.save(plan);
  }

  async findAll(): Promise<Plan[]> {
    return this.planRepository.find({
      relations: ['modules'],
      order: { price: 'ASC' },
    });
  }

  async findById(id: string): Promise<Plan> {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['modules'],
    });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    await this.findById(id);
    await this.planRepository.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.planRepository.delete(id);
  }

  async assignModules(planId: string, moduleIds: string[]): Promise<Plan> {
    const plan = await this.findById(planId);
    const modules = await this.moduleRepository.find({
      where: { id: In(moduleIds) },
    });
    plan.modules = modules;
    return this.planRepository.save(plan);
  }
}
