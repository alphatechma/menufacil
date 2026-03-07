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

export interface FloorPlanItem {
  table_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rectangle' | 'circle';
  rotation: number;
}

@Entity('floor_plans')
export class FloorPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column({ nullable: true })
  unit_id: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  layout: FloorPlanItem[];

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
