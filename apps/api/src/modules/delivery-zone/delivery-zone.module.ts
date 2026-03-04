import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryZone } from './entities/delivery-zone.entity';
import { DeliveryZoneController } from './delivery-zone.controller';
import { DeliveryZoneService } from './delivery-zone.service';
import { DeliveryZoneRepository } from './delivery-zone.repository';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryZone])],
  controllers: [DeliveryZoneController],
  providers: [DeliveryZoneService, DeliveryZoneRepository],
  exports: [DeliveryZoneService],
})
export class DeliveryZoneModule {}
