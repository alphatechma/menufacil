import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableSession } from './entities/table-session.entity';
import { RestaurantTable } from '../table/entities/table.entity';
import { Order } from '../order/entities/order.entity';
import { TableSessionController } from './table-session.controller';
import { TableSessionService } from './table-session.service';

@Module({
  imports: [TypeOrmModule.forFeature([TableSession, RestaurantTable, Order])],
  controllers: [TableSessionController],
  providers: [TableSessionService],
  exports: [TableSessionService],
})
export class TableSessionModule {}
