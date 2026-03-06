import { Controller, Get, Post, Param, Body, NotFoundException, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';
import { TableService } from './table.service';
import { TableSessionService } from '../table-session/table-session.service';

@ApiTags('Public Tables')
@Controller('public/:slug/tables')
export class TablePublicController {
  constructor(
    private readonly tableService: TableService,
    private readonly sessionService: TableSessionService,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  private async getTenant(slug: string) {
    const tenant = await this.tenantRepo.findOne({ where: { slug } });
    if (!tenant) throw new NotFoundException('Restaurante nao encontrado');
    return tenant;
  }

  @Get(':number')
  @ApiOperation({ summary: 'Get table info by number (for QR code landing)' })
  async getByNumber(@Param('slug') slug: string, @Param('number', ParseIntPipe) number: number) {
    const tenant = await this.getTenant(slug);
    const table = await this.tableService.findByNumber(number, tenant.id);
    if (!table) throw new NotFoundException('Mesa nao encontrada');
    return {
      id: table.id,
      number: table.number,
      label: table.label,
      capacity: table.capacity,
      status: table.status,
    };
  }

  @Post(':number/join')
  @ApiOperation({ summary: 'Join or get active session for a table (QR scan)' })
  async joinTable(@Param('slug') slug: string, @Param('number', ParseIntPipe) number: number) {
    const tenant = await this.getTenant(slug);
    const table = await this.tableService.findByNumber(number, tenant.id);
    if (!table) throw new NotFoundException('Mesa nao encontrada');

    let session = await this.sessionService.getActiveSession(table.id, tenant.id);
    if (!session) {
      session = await this.sessionService.openSession({ table_id: table.id }, tenant.id);
    }

    return {
      table: {
        id: table.id,
        number: table.number,
        label: table.label,
      },
      session: {
        id: session.id,
        status: session.status,
        opened_at: session.opened_at,
      },
    };
  }
}
