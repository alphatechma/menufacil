import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { TenantUnit } from './entities/tenant-unit.entity';
import { UnitController } from './unit.controller';
import { UnitPublicController } from './unit-public.controller';
import { UnitService } from './unit.service';

@Module({
  imports: [TypeOrmModule.forFeature([TenantUnit, Tenant])],
  controllers: [UnitController, UnitPublicController],
  providers: [UnitService],
  exports: [UnitService],
})
export class UnitModule {}
