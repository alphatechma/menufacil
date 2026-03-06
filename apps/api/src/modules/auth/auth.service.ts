import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserRole, IJwtPayload, IAuthTokens } from '@menufacil/shared';
import { User } from '../user/entities/user.entity';
import { Customer } from '../customer/entities/customer.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Plan } from '../plan/entities/plan.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { CustomerLoginDto, CustomerRegisterDto } from './dto/customer-login.dto';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async loginSuperAdmin(dto: SuperAdminLoginDto): Promise<IAuthTokens & { user: { id: string; name: string; email: string; role: UserRole } }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.email = :email', { email: dto.email })
      .andWhere('user.system_role = :role', { role: UserRole.SUPER_ADMIN })
      .andWhere('user.is_active = :active', { active: true })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateTokens({
      sub: user.id,
      tenant_id: user.tenant_id || '',
      role: user.system_role,
      type: 'user',
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.system_role,
      },
    };
  }

  async loginStaff(dto: LoginDto, tenantId: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.email = :email', { email: dto.email })
      .andWhere('user.tenant_id = :tenantId', { tenantId })
      .andWhere('user.is_active = :active', { active: true })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = this.generateTokens({
      sub: user.id,
      tenant_id: user.tenant_id,
      role: user.system_role,
      type: 'user',
    });

    // Fetch tenant with plan modules
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations: ['plan', 'plan.modules'],
    });

    const modules = tenant?.plan?.modules?.map((m) => m.key) || [];

    const plan = tenant?.plan
      ? { id: tenant.plan.id, name: tenant.plan.name, price: Number(tenant.plan.price) }
      : null;

    // Fetch user permissions from custom role
    let permissions: string[] = [];
    if (user.role_id) {
      const roleWithPerms = await this.dataSource.query(
        `SELECT p.key FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = $1`,
        [user.role_id],
      );
      permissions = roleWithPerms.map((r: any) => r.key);
    }

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.system_role,
        tenant_id: user.tenant_id,
        role_id: user.role_id,
      },
      modules,
      plan,
      permissions,
    };
  }

  async registerStaff(dto: RegisterDto, tenantId: string): Promise<IAuthTokens> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password_hash: passwordHash,
      system_role: dto.role || UserRole.ADMIN,
      tenant_id: tenantId,
    });

    const savedUser = await this.userRepository.save(user);

    return this.generateTokens({
      sub: savedUser.id,
      tenant_id: savedUser.tenant_id,
      role: savedUser.system_role,
      type: 'user',
    });
  }

  async loginCustomer(dto: CustomerLoginDto, tenantId: string): Promise<IAuthTokens & { customer: { id: string; name: string; phone: string; email: string | null } }> {
    let customer: Customer | null = null;

    // Email + password login
    if (dto.email && dto.password) {
      customer = await this.customerRepository.findOne({
        where: { email: dto.email, tenant_id: tenantId },
      });
      if (!customer) {
        throw new UnauthorizedException('Email ou senha incorretos');
      }
      if (!customer.password_hash) {
        throw new BadRequestException('Esta conta nao possui senha. Entre pelo telefone e crie uma senha.');
      }
      const isPasswordValid = await bcrypt.compare(dto.password, customer.password_hash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Email ou senha incorretos');
      }
    }
    // Phone login (auto-create)
    else if (dto.phone) {
      customer = await this.customerRepository.findOne({
        where: { phone: dto.phone, tenant_id: tenantId },
      });

      if (!customer) {
        customer = this.customerRepository.create({
          name: dto.name || dto.phone,
          phone: dto.phone,
          tenant_id: tenantId,
        });
        customer = await this.customerRepository.save(customer);
      } else if (dto.name && dto.name !== customer.name) {
        customer.name = dto.name;
        customer = await this.customerRepository.save(customer);
      }
    } else {
      throw new BadRequestException('Informe telefone ou email/senha para entrar');
    }

    const tokens = this.generateTokens({
      sub: customer.id,
      tenant_id: customer.tenant_id,
      role: UserRole.ADMIN,
      type: 'customer',
    });

    return {
      ...tokens,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
    };
  }

  async registerCustomer(dto: CustomerRegisterDto, tenantId: string): Promise<IAuthTokens> {
    const existing = await this.customerRepository.findOne({
      where: { phone: dto.phone, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Phone already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const customer = this.customerRepository.create({
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      password_hash: passwordHash,
      tenant_id: tenantId,
    });

    const savedCustomer = await this.customerRepository.save(customer);

    return this.generateTokens({
      sub: savedCustomer.id,
      tenant_id: savedCustomer.tenant_id,
      role: UserRole.ADMIN,
      type: 'customer',
    });
  }

  async loginAdmin(dto: LoginDto) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password_hash')
      .where('user.email = :email', { email: dto.email })
      .andWhere('user.is_active = :active', { active: true })
      .getOne();
    if (!user || !user.tenant_id) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = this.generateTokens({
      sub: user.id,
      tenant_id: user.tenant_id,
      role: user.system_role,
      type: 'user',
    });
    const tenant = await this.tenantRepository.findOne({
      where: { id: user.tenant_id },
      relations: ['plan', 'plan.modules'],
    });
    const modules = tenant?.plan?.modules?.map((m) => m.key) || [];
    const plan = tenant?.plan
      ? { id: tenant.plan.id, name: tenant.plan.name, price: Number(tenant.plan.price) }
      : null;
    // Fetch user permissions from custom role
    let permissions: string[] = [];
    if (user.role_id) {
      const roleWithPerms = await this.dataSource.query(
        `SELECT p.key FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = $1`,
        [user.role_id],
      );
      permissions = roleWithPerms.map((r: any) => r.key);
    }

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.system_role,
        tenant_id: user.tenant_id,
        role_id: user.role_id,
      },
      modules,
      plan,
      permissions,
      tenant_slug: tenant?.slug || '',
    };
  }

  async registerTenant(dto: RegisterTenantDto) {
    // Check slug uniqueness
    const existingTenant = await this.tenantRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existingTenant) {
      throw new ConflictException('Este slug ja esta em uso');
    }

    // Check email uniqueness
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Este email ja esta em uso');
    }

    // Get the plan (default to Basico if not specified)
    let planId: string | undefined = dto.plan_id;
    if (!planId) {
      const basicPlan = await this.planRepository.findOne({ where: { name: 'Basico' } });
      planId = basicPlan?.id;
    }

    // Create tenant with 7-day trial
    const tenantEntity = this.tenantRepository.create({
      name: dto.name,
      slug: dto.slug,
      phone: dto.phone || undefined,
      primary_color: '#FF6B35',
      is_active: true,
      plan_id: planId,
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const tenant = await this.tenantRepository.save(tenantEntity);

    // Create admin user
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepository.save({
      name: dto.name,
      email: dto.email,
      password_hash: passwordHash,
      system_role: UserRole.ADMIN,
      tenant_id: tenant.id,
      is_active: true,
    });

    // Generate tokens
    const tokens = this.generateTokens({
      sub: user.id,
      tenant_id: tenant.id,
      role: user.system_role,
      type: 'user',
    });

    // Get plan with modules
    const tenantWithPlan = await this.tenantRepository.findOne({
      where: { id: tenant.id },
      relations: ['plan', 'plan.modules'],
    });

    const modules = tenantWithPlan?.plan?.modules?.map((m) => m.key) || [];
    const plan = tenantWithPlan?.plan
      ? { id: tenantWithPlan.plan.id, name: tenantWithPlan.plan.name, price: Number(tenantWithPlan.plan.price) }
      : null;

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.system_role,
        tenant_id: tenant.id,
      },
      modules,
      plan,
      tenant_slug: tenant.slug,
    };
  }

  async refreshToken(refreshToken: string): Promise<IAuthTokens> {
    try {
      const payload = this.jwtService.verify<IJwtPayload>(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      return this.generateTokens({
        sub: payload.sub,
        tenant_id: payload.tenant_id,
        role: payload.role,
        type: payload.type,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(payload: IJwtPayload): IAuthTokens {
    return {
      access_token: this.jwtService.sign(payload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
      }),
      refresh_token: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    };
  }
}
