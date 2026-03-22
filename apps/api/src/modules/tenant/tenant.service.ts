import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, IsNull, Not, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserRole, IJwtPayload } from '@menufacil/shared';
import { JwtService } from '@nestjs/jwt';
import { TenantRepository } from './tenant.repository';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Tenant } from './entities/tenant.entity';
import { TenantUnit } from '../unit/entities/tenant-unit.entity';
import { User } from '../user/entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../permission/entities/permission.entity';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly tenantRepository: TenantRepository,
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
    @InjectRepository(TenantUnit)
    private readonly unitRepo: Repository<TenantUnit>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.tenantRepository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(`Slug "${dto.slug}" ja esta em uso`);
    }

    // Validate admin email uniqueness if provided
    if (dto.admin_email) {
      const existingUser = await this.userRepo.findOne({ where: { email: dto.admin_email } });
      if (existingUser) {
        throw new ConflictException(`Email "${dto.admin_email}" ja esta em uso`);
      }
    }

    // Extract admin fields before creating tenant
    const { admin_name, admin_email, admin_password, ...tenantData } = dto;

    const tenant = this.tenantRepository.create(tenantData);
    tenant.is_active = true;
    tenant.trial_ends_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const saved = await this.tenantRepository.save(tenant);

    // Auto-create headquarters unit
    try {
      const unit = this.unitRepo.create({
        tenant_id: saved.id,
        name: 'Matriz',
        slug: 'matriz',
        address: dto.address || undefined,
        phone: dto.phone || undefined,
        is_active: true,
        is_headquarters: true,
      } as any);
      await this.unitRepo.save(unit);
      this.logger.log(`Auto-created headquarters unit for tenant "${saved.slug}"`);
    } catch (err: any) {
      this.logger.warn(`Failed to auto-create headquarters unit: ${err.message}`);
    }

    // Create admin user if admin fields provided
    if (admin_name && admin_email && admin_password) {
      await this.createAdminForTenant(saved.id, admin_name, admin_email, admin_password);
    }

    return saved;
  }

  private async createAdminForTenant(tenantId: string, name: string, email: string, password: string): Promise<User> {
    // Create default "Administrador" role with all permissions
    const allPermissions = await this.permissionRepo.find();
    const adminRole = await this.roleRepo.save({
      name: 'Administrador',
      description: 'Acesso completo a todas as funcionalidades',
      tenant_id: tenantId,
      is_system_default: true,
      permissions: allPermissions,
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepo.save({
      name,
      email,
      password_hash: passwordHash,
      system_role: UserRole.ADMIN,
      tenant_id: tenantId,
      role_id: adminRole.id,
      is_active: true,
    });

    this.logger.log(`Created admin user "${email}" for tenant "${tenantId}"`);
    return user;
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.findAll();
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findBySlug(slug);
    if (!tenant) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    return tenant;
  }

  async findBySlugOptional(slug: string): Promise<Tenant | null> {
    return this.tenantRepository.findBySlug(slug);
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    if (dto.slug) {
      const existing = await this.tenantRepository.findBySlug(dto.slug);
      if (existing && existing.id !== id) {
        throw new ConflictException('Já existe um estabelecimento com esse slug/código.');
      }
    }

    const tenant = await this.tenantRepository.update(id, dto);
    if (!tenant) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    return tenant;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.tenantRepository.remove(id);
  }

  // Super-admin methods

  async findAllForSuperAdmin(params: {
    search?: string;
    is_active?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Tenant[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const where: any = {};
    if (params.is_active !== undefined && params.is_active !== '') {
      where.is_active = params.is_active === 'true';
    }
    if (params.search) {
      where.name = ILike(`%${params.search}%`);
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['plan'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findByIdWithRelations(id: string): Promise<Tenant & { admin_email?: string }> {
    const tenant = await this.repo.findOne({
      where: { id },
      relations: ['plan', 'plan.modules'],
    });
    if (!tenant) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    // Attach admin email for super-admin detail view
    const admin = await this.userRepo.findOne({
      where: { tenant_id: id, system_role: UserRole.ADMIN },
      select: ['email'],
    });
    return { ...tenant, admin_email: admin?.email || undefined };
  }

  async toggleActive(id: string): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.is_active = !tenant.is_active;
    return this.repo.save(tenant);
  }

  async assignPlan(id: string, planId: string): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.plan_id = planId;
    return this.repo.save(tenant);
  }

  // --- Super-admin: Reset Password ---

  async resetAdminPassword(tenantId: string, newPassword: string): Promise<void> {
    const admin = await this.userRepo.findOne({
      where: { tenant_id: tenantId, system_role: UserRole.ADMIN },
    });
    if (!admin) {
      throw new NotFoundException('Usuario administrador nao encontrado para este estabelecimento');
    }
    admin.password_hash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(admin);
    this.logger.log(`Password reset for admin of tenant ${tenantId}`);
  }

  // --- Super-admin: Update Admin Email ---

  async updateAdminEmail(tenantId: string, newEmail: string): Promise<void> {
    const admin = await this.userRepo.findOne({
      where: { tenant_id: tenantId, system_role: UserRole.ADMIN },
    });
    if (!admin) {
      throw new NotFoundException('Usuario administrador nao encontrado para este estabelecimento');
    }
    // Check email uniqueness
    const existing = await this.userRepo.findOne({ where: { email: newEmail } });
    if (existing && existing.id !== admin.id) {
      throw new ConflictException(`Email "${newEmail}" ja esta em uso`);
    }
    admin.email = newEmail;
    await this.userRepo.save(admin);
    this.logger.log(`Email updated for admin of tenant ${tenantId} to ${newEmail}`);
  }

  // --- Super-admin: Session Management ---

  async revokeAllSessions(tenantId: string): Promise<{ count: number }> {
    const result = await this.userRepo.update(
      { tenant_id: tenantId },
      { token_revoked_at: new Date() },
    );
    this.logger.log(`Revoked all sessions for tenant ${tenantId}: ${result.affected} users`);
    return { count: result.affected || 0 };
  }

  async revokeUserSession(tenantId: string, userId: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId, tenant_id: tenantId },
    });
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado para este estabelecimento');
    }
    user.token_revoked_at = new Date();
    await this.userRepo.save(user);
    this.logger.log(`Revoked session for user ${userId} of tenant ${tenantId}`);
  }

  // --- Super-admin: List Staff ---

  async getTenantUsers(tenantId: string): Promise<User[]> {
    return this.userRepo.find({
      where: { tenant_id: tenantId },
      relations: ['role', 'unit'],
      order: { created_at: 'ASC' },
    });
  }

  // --- Super-admin: Get Admin for Impersonation ---

  async getTenantAdmin(tenantId: string): Promise<User> {
    const admin = await this.userRepo.findOne({
      where: { tenant_id: tenantId, system_role: UserRole.ADMIN },
    });
    if (!admin) {
      throw new NotFoundException('Usuario administrador nao encontrado para este estabelecimento');
    }
    return admin;
  }

  async impersonate(tenantId: string, superAdminId: string, jwtService: JwtService) {
    const admin = await this.getTenantAdmin(tenantId);
    const tenant = await this.findByIdWithRelations(tenantId);

    const payload: IJwtPayload = {
      sub: admin.id,
      tenant_id: admin.tenant_id,
      role: admin.system_role,
      type: 'user',
      impersonated_by: superAdminId,
    };

    const access_token = jwtService.sign(payload, { expiresIn: '1h' });

    // Fetch modules from plan
    const modules = tenant.plan?.modules?.map((m) => m.key) || [];
    const plan = tenant.plan
      ? { id: tenant.plan.id, name: tenant.plan.name, price: Number(tenant.plan.price) }
      : null;

    // Fetch permissions from admin's role
    let permissions: string[] = [];
    if (admin.role_id) {
      const rolePerms = await this.dataSource.query(
        `SELECT p.key FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = $1`,
        [admin.role_id],
      );
      permissions = rolePerms.map((r: any) => r.key);
    }

    return {
      access_token,
      tenant_slug: tenant.slug,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.system_role,
        tenant_id: admin.tenant_id,
        role_id: admin.role_id,
      },
      modules,
      permissions,
      plan,
    };
  }

  // --- Super-admin: Soft Delete / Restore ---

  async softDelete(id: string): Promise<void> {
    const tenant = await this.findById(id);
    await this.repo.softRemove(tenant);
    this.logger.log(`Soft-deleted tenant ${id}`);
  }

  async hardDelete(id: string): Promise<void> {
    const tenant = await this.repo.findOne({ where: { id }, withDeleted: true });
    if (!tenant) throw new NotFoundException('Estabelecimento não encontrado');

    // Delete in dependency order (children before parents)
    // Level 4: deepest children
    await this.repo.query('DELETE FROM order_item_extras WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE tenant_id = $1))', [id]);
    await this.repo.query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE tenant_id = $1)', [id]);
    await this.repo.query('DELETE FROM payment_transactions WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM loyalty_redemptions WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM reviews WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM abandoned_carts WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM referrals WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM wallet_transactions WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM wallets WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM notifications WHERE tenant_id = $1', [id]);

    // Level 3: order-related
    await this.repo.query('DELETE FROM orders WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM cash_registers WHERE tenant_id = $1', [id]);

    // Level 2: product-related
    await this.repo.query('DELETE FROM product_recipes WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM stock_movements WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM inventory_items WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM extras WHERE extra_group_id IN (SELECT id FROM extra_groups WHERE tenant_id = $1)', [id]);
    await this.repo.query('DELETE FROM extra_groups WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM product_variations WHERE product_id IN (SELECT id FROM products WHERE tenant_id = $1)', [id]);
    await this.repo.query('DELETE FROM promotions WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM products WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM categories WHERE tenant_id = $1', [id]);

    // Level 2: customer-related
    await this.repo.query('DELETE FROM customer_addresses WHERE customer_id IN (SELECT id FROM customers WHERE tenant_id = $1)', [id]);
    await this.repo.query('DELETE FROM customers WHERE tenant_id = $1', [id]);

    // Level 2: table/reservation
    await this.repo.query('DELETE FROM table_sessions WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM floor_plans WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM restaurant_tables WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM reservations WHERE tenant_id = $1', [id]);

    // Level 2: delivery
    await this.repo.query('DELETE FROM delivery_zones WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM delivery_persons WHERE tenant_id = $1', [id]);

    // Level 2: loyalty/coupons
    await this.repo.query('DELETE FROM loyalty_rewards WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM loyalty_tiers WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM coupons WHERE tenant_id = $1', [id]);

    // Level 2: whatsapp
    await this.repo.query('DELETE FROM whatsapp_messages WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM whatsapp_flow_executions WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM whatsapp_flows WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM whatsapp_message_templates WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM whatsapp_instances WHERE tenant_id = $1', [id]);

    // Level 1: users, roles, units
    await this.repo.query('DELETE FROM users WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM roles WHERE tenant_id = $1', [id]);
    await this.repo.query('DELETE FROM tenant_units WHERE tenant_id = $1', [id]);

    // Level 0: tenant itself
    await this.repo.query('DELETE FROM tenants WHERE id = $1', [id]);
    this.logger.warn(`PERMANENTLY deleted tenant ${id} (${tenant.name})`);
  }

  async restore(id: string): Promise<Tenant> {
    const tenant = await this.repo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!tenant) {
      throw new NotFoundException('Estabelecimento não encontrado');
    }
    if (!tenant.deleted_at) {
      throw new BadRequestException('Este estabelecimento nao esta excluido');
    }
    await this.repo.recover(tenant);
    this.logger.log(`Restored tenant ${id}`);
    return tenant;
  }

  async findAllForSuperAdminWithDeleted(params: {
    search?: string;
    is_active?: string;
    deleted?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Tenant[]; total: number; page: number; limit: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;

    const qb = this.repo.createQueryBuilder('tenant')
      .leftJoinAndSelect('tenant.plan', 'plan')
      .orderBy('tenant.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (params.deleted === 'true') {
      qb.withDeleted().andWhere('tenant.deleted_at IS NOT NULL');
    }

    if (params.is_active !== undefined && params.is_active !== '') {
      qb.andWhere('tenant.is_active = :is_active', { is_active: params.is_active === 'true' });
    }

    if (params.search) {
      qb.andWhere('(tenant.name ILIKE :search OR tenant.slug ILIKE :search)', { search: `%${params.search}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}
