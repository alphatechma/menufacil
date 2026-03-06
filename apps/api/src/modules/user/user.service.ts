import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@menufacil/shared';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(dto: CreateUserDto, tenantId: string): Promise<User> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password_hash: passwordHash,
      system_role: dto.role || UserRole.CASHIER,
      tenant_id: tenantId,
      role_id: dto.role_id,
    } as any);

    return this.userRepository.save(user);
  }

  async findAll(tenantId: string): Promise<User[]> {
    return this.userRepository.findAllByTenant(tenantId);
  }

  async findById(id: string, tenantId: string): Promise<User> {
    const user = await this.userRepository.findById(id, tenantId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto, tenantId: string): Promise<User> {
    await this.findById(id, tenantId);
    const { role, role_id, ...rest } = dto as any;
    const updateData: any = { ...rest };
    if (role) updateData.system_role = role;
    if (role_id !== undefined) updateData.role_id = role_id;
    await this.userRepository.update(id, tenantId, updateData);
    return this.findById(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findById(id, tenantId);
    await this.userRepository.delete(id, tenantId);
  }

  async changePassword(id: string, tenantId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(id, tenantId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userWithPassword = await this.userRepository.findByIdWithPassword(id, tenantId);
    if (!userWithPassword) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, userWithPassword.password_hash);
    if (!isValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(id, tenantId, { password_hash: newHash });
  }
}
