import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const existing = await this.permissionRepository.findOne({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException(`Permission with key "${dto.key}" already exists`);
    }
    const permission = this.permissionRepository.create(dto);
    return this.permissionRepository.save(permission);
  }

  async findAll(moduleId?: string): Promise<Permission[]> {
    const where: any = {};
    if (moduleId) {
      where.module_id = moduleId;
    }
    return this.permissionRepository.find({
      where,
      relations: ['module'],
      order: { key: 'ASC' },
    });
  }

  async findById(id: string): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
      relations: ['module'],
    });
    if (!permission) {
      throw new NotFoundException('Permission not found');
    }
    return permission;
  }

  async update(id: string, dto: UpdatePermissionDto): Promise<Permission> {
    await this.findById(id);
    if (dto.key) {
      const existing = await this.permissionRepository.findOne({ where: { key: dto.key } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Permission with key "${dto.key}" already exists`);
      }
    }
    await this.permissionRepository.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.permissionRepository.delete(id);
  }
}
