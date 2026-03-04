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
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CustomerLoginDto, CustomerRegisterDto } from './dto/customer-login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async loginStaff(dto: LoginDto, tenantId: string): Promise<IAuthTokens> {
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

    return this.generateTokens({
      sub: user.id,
      tenant_id: user.tenant_id,
      role: user.role,
      type: 'user',
    });
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
      role: dto.role || UserRole.ADMIN,
      tenant_id: tenantId,
    });

    const savedUser = await this.userRepository.save(user);

    return this.generateTokens({
      sub: savedUser.id,
      tenant_id: savedUser.tenant_id,
      role: savedUser.role,
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
