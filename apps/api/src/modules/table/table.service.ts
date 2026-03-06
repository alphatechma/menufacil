import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RestaurantTable, TableStatus } from './entities/table.entity';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';

@Injectable()
export class TableService {
  constructor(
    @InjectRepository(RestaurantTable)
    private readonly tableRepo: Repository<RestaurantTable>,
  ) {}

  async findAll(tenantId: string): Promise<RestaurantTable[]> {
    return this.tableRepo.find({
      where: { tenant_id: tenantId },
      order: { sort_order: 'ASC', number: 'ASC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<RestaurantTable> {
    const table = await this.tableRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!table) throw new NotFoundException('Mesa nao encontrada');
    return table;
  }

  async findByNumber(number: number, tenantId: string): Promise<RestaurantTable | null> {
    return this.tableRepo.findOne({ where: { number, tenant_id: tenantId } });
  }

  async create(dto: CreateTableDto, tenantId: string): Promise<RestaurantTable> {
    const existing = await this.findByNumber(dto.number, tenantId);
    if (existing) throw new ConflictException(`Mesa ${dto.number} ja existe`);

    const table = this.tableRepo.create({
      ...dto,
      tenant_id: tenantId,
    });
    return this.tableRepo.save(table);
  }

  async update(id: string, dto: UpdateTableDto, tenantId: string): Promise<RestaurantTable> {
    const table = await this.findById(id, tenantId);

    if (dto.number && dto.number !== table.number) {
      const existing = await this.findByNumber(dto.number, tenantId);
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
