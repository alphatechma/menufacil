import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { Tenant } from '../tenant/entities/tenant.entity';
import { ReservationController } from './reservation.controller';
import { ReservationPublicController } from './reservation-public.controller';
import { ReservationService } from './reservation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Tenant])],
  controllers: [ReservationController, ReservationPublicController],
  providers: [ReservationService],
  exports: [ReservationService],
})
export class ReservationModule {}
