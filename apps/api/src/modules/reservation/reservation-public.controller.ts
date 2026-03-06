import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { NotFoundException } from '@nestjs/common';

@ApiTags('Public Reservations')
@Controller('public/:slug/reservations')
export class ReservationPublicController {
  constructor(
    private readonly service: ReservationService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Customer creates a reservation request' })
  async createPublic(
    @Param('slug') slug: string,
    @Body() dto: CreateReservationDto,
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { slug } });
    if (!tenant) throw new NotFoundException('Restaurante nao encontrado');

    return this.service.create(dto, tenant.id);
  }
}
