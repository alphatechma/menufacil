import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPerson } from './entities/delivery-person.entity';
import { Order } from '../order/entities/order.entity';
import { DeliveryPersonController } from './delivery-person.controller';
import { DeliveryPersonService } from './delivery-person.service';
import { DeliveryPersonRepository } from './delivery-person.repository';
import { AutoAssignService } from './auto-assign.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryPerson, Order])],
  controllers: [DeliveryPersonController],
  providers: [DeliveryPersonService, DeliveryPersonRepository, AutoAssignService],
  exports: [DeliveryPersonService, AutoAssignService],
})
export class DeliveryPersonModule {}
