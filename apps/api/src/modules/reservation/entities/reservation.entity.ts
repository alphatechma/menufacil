import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { TenantUnit } from '../../unit/entities/tenant-unit.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column({ nullable: true })
  unit_id: string;

  @Column({ nullable: true })
  table_id: string;

  @Column({ nullable: true })
  customer_id: string;

  @Column()
  customer_name: string;

  @Column()
  customer_phone: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  time_start: string;

  @Column({ type: 'time', nullable: true })
  time_end: string;

  @Column()
  party_size: number;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => TenantUnit, { nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit: TenantUnit;
}
