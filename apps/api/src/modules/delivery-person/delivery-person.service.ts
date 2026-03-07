import { Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryPersonRepository } from './delivery-person.repository';
import { CreateDeliveryPersonDto } from './dto/create-delivery-person.dto';
import { UpdateDeliveryPersonDto } from './dto/update-delivery-person.dto';
import { DeliveryPerson } from './entities/delivery-person.entity';

@Injectable()
export class DeliveryPersonService {
  constructor(private readonly repository: DeliveryPersonRepository) {}

  async create(dto: CreateDeliveryPersonDto, tenantId: string, unitId?: string | null): Promise<DeliveryPerson> {
    const entity = this.repository.create({
      ...dto,
      tenant_id: tenantId,
      unit_id: unitId || undefined,
    });
    return this.repository.save(entity);
  }

  async findAll(tenantId: string, unitId?: string | null): Promise<DeliveryPerson[]> {
    return this.repository.findByTenant(tenantId, unitId);
  }

  async findById(id: string, tenantId: string): Promise<DeliveryPerson> {
    const entity = await this.repository.findById(id, tenantId);
    if (!entity) throw new NotFoundException('Entregador nao encontrado');
    return entity;
  }

  async findByIdWithOrders(id: string, tenantId: string): Promise<DeliveryPerson> {
    const entity = await this.repository.findByIdWithOrders(id, tenantId);
    if (!entity) throw new NotFoundException('Entregador nao encontrado');
    return entity;
  }

  async update(id: string, dto: UpdateDeliveryPersonDto, tenantId: string): Promise<DeliveryPerson> {
    await this.findById(id, tenantId);
    await this.repository.update(id, tenantId, dto);
    return this.findById(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findById(id, tenantId);
    await this.repository.remove(id, tenantId);
  }
}
