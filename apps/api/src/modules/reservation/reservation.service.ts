import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Injectable()
export class ReservationService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
  ) {}

  async create(dto: CreateReservationDto, tenantId: string, unitId?: string | null): Promise<Reservation> {
    const reservation = this.reservationRepo.create({
      ...dto,
      tenant_id: tenantId,
      unit_id: unitId || undefined,
    });
    return this.reservationRepo.save(reservation);
  }

  async findByTenant(
    tenantId: string,
    filters?: { date?: string; status?: ReservationStatus },
    unitId?: string | null,
  ): Promise<Reservation[]> {
    const where: any = { tenant_id: tenantId };
    if (unitId) {
      where.unit_id = unitId;
    }
    if (filters?.date) where.date = filters.date;
    if (filters?.status) where.status = filters.status;

    return this.reservationRepo.find({
      where,
      order: { date: 'ASC', time_start: 'ASC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Reservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { id, tenant_id: tenantId },
    });
    if (!reservation) throw new NotFoundException('Reserva nao encontrada');
    return reservation;
  }

  async updateStatus(
    id: string,
    status: ReservationStatus,
    tenantId: string,
  ): Promise<Reservation> {
    const reservation = await this.findById(id, tenantId);
    reservation.status = status;
    return this.reservationRepo.save(reservation);
  }

  async findAvailableTables(
    tenantId: string,
    date: string,
    timeStart: string,
    partySize: number,
  ): Promise<any[]> {
    // Find tables that are not reserved at the given time
    const reserved = await this.reservationRepo
      .createQueryBuilder('r')
      .select('r.table_id')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.date = :date', { date })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
      })
      .andWhere('r.time_start <= :timeStart AND (r.time_end IS NULL OR r.time_end > :timeStart)', {
        timeStart,
      })
      .andWhere('r.table_id IS NOT NULL')
      .getMany();

    const reservedTableIds = reserved.map((r) => r.table_id);
    return reservedTableIds;
  }
}
