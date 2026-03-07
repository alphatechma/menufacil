import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { ReservationStatus } from './entities/reservation.entity';
import { CurrentTenant, CurrentUnit, RequirePermissions } from '../../common/decorators';
import { PermissionsGuard } from '../../common/guards';

@ApiTags('Reservations')
@ApiSecurity('tenant-slug')
@ApiBearerAuth()
@Controller('reservations')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ReservationController {
  constructor(private readonly service: ReservationService) {}

  @Get()
  @RequirePermissions('reservation:read')
  @ApiOperation({ summary: 'List reservations for tenant' })
  findAll(
    @CurrentTenant('id') tenantId: string,
    @CurrentUnit() unitId: string | null,
    @Query('date') date?: string,
    @Query('status') status?: ReservationStatus,
  ) {
    return this.service.findByTenant(tenantId, { date, status }, unitId);
  }

  @Post()
  @RequirePermissions('reservation:update')
  @ApiOperation({ summary: 'Create reservation (staff)' })
  create(
    @Body() dto: CreateReservationDto,
    @CurrentTenant('id') tenantId: string,
    @CurrentUnit() unitId: string | null,
  ) {
    return this.service.create(dto, tenantId, unitId);
  }

  @Patch(':id/status')
  @RequirePermissions('reservation:update')
  @ApiOperation({ summary: 'Update reservation status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReservationStatusDto,
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.service.updateStatus(id, dto.status, tenantId);
  }
}
