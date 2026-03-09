import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Tenant } from './entities/tenant.entity';
import { TenantUnit } from '../unit/entities/tenant-unit.entity';
import { User } from '../user/entities/user.entity';
import { Role } from '../role/entities/role.entity';
import { Permission } from '../permission/entities/permission.entity';
import { TenantController } from './tenant.controller';
import { SuperAdminTenantController } from './super-admin-tenant.controller';
import { TenantService } from './tenant.service';
import { TenantRepository } from './tenant.repository';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantUnit, User, Role, Permission]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'your-jwt-secret-change-in-production'),
      }),
    }),
    forwardRef(() => WhatsappModule),
  ],
  controllers: [TenantController, SuperAdminTenantController],
  providers: [TenantService, TenantRepository],
  exports: [TenantService, TenantRepository, TypeOrmModule.forFeature([Tenant])],
})
export class TenantModule {}
