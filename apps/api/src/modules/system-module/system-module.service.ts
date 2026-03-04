import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemModule } from './entities/system-module.entity';
import { CreateSystemModuleDto } from './dto/create-system-module.dto';
import { UpdateSystemModuleDto } from './dto/update-system-module.dto';

@Injectable()
export class SystemModuleService {
  constructor(
    @InjectRepository(SystemModule)
    private readonly moduleRepository: Repository<SystemModule>,
  ) {}

  async create(dto: CreateSystemModuleDto): Promise<SystemModule> {
    const existing = await this.moduleRepository.findOne({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException(`Module with key "${dto.key}" already exists`);
    }
    const mod = this.moduleRepository.create(dto);
    return this.moduleRepository.save(mod);
  }

  async findAll(): Promise<SystemModule[]> {
    return this.moduleRepository.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<SystemModule> {
    const mod = await this.moduleRepository.findOne({ where: { id } });
    if (!mod) {
      throw new NotFoundException('System module not found');
    }
    return mod;
  }

  async update(id: string, dto: UpdateSystemModuleDto): Promise<SystemModule> {
    await this.findById(id);
    if (dto.key) {
      const existing = await this.moduleRepository.findOne({ where: { key: dto.key } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Module with key "${dto.key}" already exists`);
      }
    }
    await this.moduleRepository.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.moduleRepository.delete(id);
  }
}
