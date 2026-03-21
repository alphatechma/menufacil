import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from '../permission/entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(dto: CreateRoleDto, tenantId: string): Promise<Role> {
    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description,
      tenant_id: tenantId,
    });

    if (dto.permission_ids?.length) {
      role.permissions = await this.permissionRepository.findBy({
        id: In(dto.permission_ids),
      });
    }

    return this.roleRepository.save(role);
  }

  async findAll(tenantId: string): Promise<Role[]> {
    return this.roleRepository.find({
      where: { tenant_id: tenantId },
      relations: ['permissions', 'permissions.module'],
      order: { name: 'ASC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['permissions', 'permissions.module'],
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async update(id: string, dto: UpdateRoleDto, tenantId: string): Promise<Role> {
    const role = await this.findById(id, tenantId);

    if (role.is_system_default) {
      throw new BadRequestException('Cannot modify system default roles');
    }

    if (dto.name !== undefined) role.name = dto.name;
    if (dto.description !== undefined) role.description = dto.description;

    if (dto.permission_ids !== undefined) {
      role.permissions = dto.permission_ids.length
        ? await this.permissionRepository.findBy({ id: In(dto.permission_ids) })
        : [];
    }

    return this.roleRepository.save(role);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const role = await this.findById(id, tenantId);
    if (role.is_system_default) {
      throw new BadRequestException('Cannot delete system default roles');
    }
    // Delete role_permissions and nullify users referencing this role to avoid FK constraint violation
    await this.roleRepository.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);
    await this.roleRepository.query('UPDATE users SET role_id = NULL WHERE role_id = $1', [id]);
    await this.roleRepository.remove(role);
  }
}
