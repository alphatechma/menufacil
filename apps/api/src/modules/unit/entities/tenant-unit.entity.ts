import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';

@Entity('tenant_units')
@Unique(['tenant_id', 'slug'])
export class TenantUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'jsonb', nullable: true })
  business_hours: Record<string, { open: boolean; openTime: string; closeTime: string }>;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_headquarters: boolean;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{\"delivery\": true, \"pickup\": false, \"dine_in\": false}'" })
  order_modes: { delivery: boolean; pickup: boolean; dine_in: boolean };

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
