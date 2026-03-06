import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantTable } from './entities/table.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { TableController } from './table.controller';
import { TablePublicController } from './table-public.controller';
import { TableService } from './table.service';
import { TableSessionModule } from '../table-session/table-session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RestaurantTable, Tenant]),
    forwardRef(() => TableSessionModule),
  ],
  controllers: [TableController, TablePublicController],
  providers: [TableService],
  exports: [TableService],
})
export class TableModule {}
