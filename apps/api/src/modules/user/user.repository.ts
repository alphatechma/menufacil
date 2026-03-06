import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findAllByTenant(tenantId: string): Promise<User[]> {
    return this.repo.find({
      where: { tenant_id: tenantId },
      relations: ['role'],
      order: { created_at: 'DESC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['role', 'role.permissions'],
    });
  }

  async findByIdWithPassword(id: string, tenantId: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.id = :id', { id })
      .andWhere('user.tenant_id = :tenantId', { tenantId })
      .getOne();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  create(data: Partial<User>): User {
    return this.repo.create(data);
  }

  async update(id: string, tenantId: string, data: Partial<User>): Promise<void> {
    await this.repo.update({ id, tenant_id: tenantId }, data as any);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenant_id: tenantId }, { is_active: false });
  }
}
