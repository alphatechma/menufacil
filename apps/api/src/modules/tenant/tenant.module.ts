import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantUnit } from '../unit/entities/tenant-unit.entity';
import { TenantController } from './tenant.controller';
import { SuperAdminTenantController } from './super-admin-tenant.controller';
import { TenantService } from './tenant.service';
import { TenantRepository } from './tenant.repository';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantUnit])],
  controllers: [TenantController, SuperAdminTenantController],
  providers: [TenantService, TenantRepository],
  exports: [TenantService, TenantRepository, TypeOrmModule.forFeature([Tenant])],
})
export class TenantModule {}
