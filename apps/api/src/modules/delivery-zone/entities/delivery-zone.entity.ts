import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { TenantUnit } from '../../unit/entities/tenant-unit.entity';

@Entity('delivery_zones')
export class DeliveryZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column({ nullable: true })
  unit_id: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  fee: number;

  @Column({ type: 'jsonb', default: [] })
  neighborhoods: string[];

  @Column({ type: 'jsonb', default: [] })
  polygon: Array<{ lat: number; lng: number }>;

  @Column({ default: 0 })
  min_delivery_time: number;

  @Column({ default: 0 })
  max_delivery_time: number;

  @ManyToOne(() => Tenant, (tenant) => tenant.delivery_zones)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => TenantUnit, { nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit: TenantUnit;
}
