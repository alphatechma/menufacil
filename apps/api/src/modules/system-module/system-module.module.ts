import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemModule } from './entities/system-module.entity';
import { SystemModuleService } from './system-module.service';
import { SystemModuleController } from './system-module.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SystemModule])],
  controllers: [SystemModuleController],
  providers: [SystemModuleService],
  exports: [SystemModuleService],
})
export class SystemModuleModule {}
