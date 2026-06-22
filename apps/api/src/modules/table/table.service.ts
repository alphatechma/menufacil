import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantTable, TableStatus } from './entities/table.entity';
import { TenantUnit } from '../unit/entities/tenant-unit.entity';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TableService {
  constructor(
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
    @InjectRepository(TenantUnit)
    private readonly unitRepo: Repository<TenantUnit>,
  ) {}

  /** Resolve the unit to anchor a table to: the one in context, or the tenant's HQ unit. */
  private async resolveUnitId(tenantId: string, unitId?: string | null): Promise<string | null> {
    if (unitId) return unitId;
    const hq = await this.unitRepo.findOne({ where: { tenant_id: tenantId, is_headquarters: true } });
    return hq?.id ?? null;
  }

  async findAll(tenantId: string, unitId?: string | null): Promise<RestaurantTable[]> {
    const where: any = { tenant_id: tenantId };
    if (unitId) {
      where.unit_id = unitId;
    }
    return this.tableRepo.find({
      where,
      order: { sort_order: 'ASC', number: 'ASC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<RestaurantTable> {
    const table = await this.tableRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!table) throw new NotFoundException('Mesa nao encontrada');
    return table;
  }

  async findByNumber(number: number, tenantId: string, unitId?: string | null): Promise<RestaurantTable | null> {
    // Mirror findAll: table numbers are unique per unit when a unit is in context,
    // otherwise tenant-wide. Keeps the uniqueness check consistent with the listing.
    const where: any = { number, tenant_id: tenantId };
    if (unitId) {
      where.unit_id = unitId;
    }
    return this.tableRepo.findOne({ where });
  }

  async create(dto: CreateTableDto, tenantId: string, unitId?: string | null): Promise<RestaurantTable> {
    // Always anchor the table to a unit (falling back to the tenant's HQ) so it never becomes a
    // "ghost" that disappears once the listing is filtered by a unit.
    const effectiveUnitId = await this.resolveUnitId(tenantId, unitId);
    const existing = await this.findByNumber(dto.number, tenantId, effectiveUnitId);
    if (existing) throw new ConflictException(`Mesa ${dto.number} ja existe`);

    const table = this.tableRepo.create({
      ...dto,
      tenant_id: tenantId,
      unit_id: effectiveUnitId || undefined,
    });
    return this.tableRepo.save(table);
  }

  async update(id: string, dto: UpdateTableDto, tenantId: string): Promise<RestaurantTable> {
    const table = await this.findById(id, tenantId);

    if (dto.number && dto.number !== table.number) {
      const existing = await this.findByNumber(dto.number, tenantId, table.unit_id);
      if (existing) throw new ConflictException(`Mesa ${dto.number} ja existe`);
    }

    Object.assign(table, dto);
    return this.tableRepo.save(table);
  }

  async updateStatus(id: string, status: TableStatus, tenantId: string): Promise<RestaurantTable> {
    const table = await this.findById(id, tenantId);
    table.status = status;
    return this.tableRepo.save(table);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const table = await this.findById(id, tenantId);
    // Delete related table_sessions first to avoid FK constraint violation
    await this.tableRepo.query('DELETE FROM table_sessions WHERE table_id = $1', [id]);
    await this.tableRepo.remove(table);
  }

  async getQrCodeData(id: string, tenantId: string, slug: string): Promise<{ url: string; tableNumber: number }> {
    const table = await this.findById(id, tenantId);
    return {
      url: `/${slug}/mesa/${table.number}`,
      tableNumber: table.number,
    };
  }
}
