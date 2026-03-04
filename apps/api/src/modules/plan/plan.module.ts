import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './entities/plan.entity';
import { SystemModule } from '../system-module/entities/system-module.entity';
import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';
import { PlanPublicController } from './plan-public.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, SystemModule])],
  controllers: [PlanController, PlanPublicController],
  providers: [PlanService],
  exports: [PlanService],
})
export class PlanModule {}
