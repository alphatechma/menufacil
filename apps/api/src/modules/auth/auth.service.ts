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
import { Repository } from 'typeorm';
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
  ) {}

  async loginSuperAdmin(dto: SuperAdminLoginDto): Promise<IAuthTokens & { user: { id: string; name: string; email: string; role: UserRole } }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email, system_role: UserRole.SUPER_ADMIN, is_active: true },
    });

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
    const user = await this.userRepository.findOne({
      where: { email: dto.email, tenant_id: tenantId, is_active: true },
    });

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

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.system_role,
        tenant_id: user.tenant_id,
      },
      modules,
      plan,
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
    let customer = await this.customerRepository.findOne({
      where: { phone: dto.phone, tenant_id: tenantId },
    });

    // Auto-create customer if not found (phone-only login)
    if (!customer) {
      customer = this.customerRepository.create({
        name: dto.name || dto.phone,
        phone: dto.phone,
        tenant_id: tenantId,
      });
      customer = await this.customerRepository.save(customer);
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
    const user = await this.userRepository.findOne({
      where: { email: dto.email, is_active: true },
    });
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
    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.system_role,
        tenant_id: user.tenant_id,
      },
      modules,
      plan,
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
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      }),
      refresh_token: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    };
  }
}
