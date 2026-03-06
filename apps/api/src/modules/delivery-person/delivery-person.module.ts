import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPerson } from './entities/delivery-person.entity';
import { DeliveryPersonController } from './delivery-person.controller';
import { DeliveryPersonService } from './delivery-person.service';
import { DeliveryPersonRepository } from './delivery-person.repository';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryPerson])],
  controllers: [DeliveryPersonController],
  providers: [DeliveryPersonService, DeliveryPersonRepository],
  exports: [DeliveryPersonService],
})
export class DeliveryPersonModule {}
