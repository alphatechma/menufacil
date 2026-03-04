import { Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryZoneRepository } from './delivery-zone.repository';
import { CreateDeliveryZoneDto } from './dto/create-delivery-zone.dto';
import { UpdateDeliveryZoneDto } from './dto/update-delivery-zone.dto';
import { DeliveryZone } from './entities/delivery-zone.entity';

@Injectable()
export class DeliveryZoneService {
  constructor(private readonly repository: DeliveryZoneRepository) {}

  async create(dto: CreateDeliveryZoneDto, tenantId: string): Promise<DeliveryZone> {
    const zone = this.repository.create({
      ...dto,
      polygon: dto.polygon || [],
      tenant_id: tenantId,
    });
    return this.repository.save(zone);
  }

  async findAll(tenantId: string): Promise<DeliveryZone[]> {
    return this.repository.findByTenant(tenantId);
  }

  async findById(id: string, tenantId: string): Promise<DeliveryZone> {
    const zone = await this.repository.findById(id, tenantId);
    if (!zone) throw new NotFoundException('Delivery zone not found');
    return zone;
  }

  async update(id: string, dto: UpdateDeliveryZoneDto, tenantId: string): Promise<DeliveryZone> {
    await this.findById(id, tenantId);
    await this.repository.update(id, tenantId, dto);
    return this.findById(id, tenantId);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findById(id, tenantId);
    await this.repository.remove(id, tenantId);
  }

  async findByNeighborhood(neighborhood: string, tenantId: string): Promise<{ zone: DeliveryZone | null; fee: number; min_delivery_time: number; max_delivery_time: number }> {
    const zones = await this.repository.findByTenant(tenantId);
    const normalized = neighborhood.toLowerCase().trim();

    for (const zone of zones) {
      const hasNeighborhoods = zone.neighborhoods && zone.neighborhoods.length > 0;
      const match = hasNeighborhoods
        ? zone.neighborhoods.some((n) => n.toLowerCase().trim() === normalized)
        : zone.name.toLowerCase().trim() === normalized;
      if (match) {
        return {
          zone,
          fee: Number(zone.fee),
          min_delivery_time: zone.min_delivery_time,
          max_delivery_time: zone.max_delivery_time,
        };
      }
    }

    return { zone: null, fee: 0, min_delivery_time: 0, max_delivery_time: 0 };
  }

  async calculateDeliveryFee(lat: number, lng: number, tenantId: string): Promise<{ zone: DeliveryZone | null; fee: number }> {
    const zones = await this.repository.findByTenant(tenantId);

    for (const zone of zones) {
      if (zone.polygon?.length > 0 && this.isPointInPolygon({ lat, lng }, zone.polygon)) {
        return { zone, fee: Number(zone.fee) };
      }
    }

    return { zone: null, fee: 0 };
  }

  private isPointInPolygon(point: { lat: number; lng: number }, polygon: Array<{ lat: number; lng: number }>): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;

      const intersect = ((yi > point.lng) !== (yj > point.lng)) &&
        (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
