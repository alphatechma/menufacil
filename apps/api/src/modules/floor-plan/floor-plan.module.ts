import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FloorPlan } from './entities/floor-plan.entity';
import { FloorPlanController } from './floor-plan.controller';
import { FloorPlanService } from './floor-plan.service';

@Module({
  imports: [TypeOrmModule.forFeature([FloorPlan])],
  controllers: [FloorPlanController],
  providers: [FloorPlanService],
  exports: [FloorPlanService],
})
export class FloorPlanModule {}
