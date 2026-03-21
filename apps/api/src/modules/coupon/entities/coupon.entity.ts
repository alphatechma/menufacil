import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DiscountType } from '@menufacil/shared';
import { Tenant } from '../../tenant/entities/tenant.entity';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  code: string;

  @Column({ type: 'enum', enum: DiscountType })
  discount_type: DiscountType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discount_value: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  min_order: number;

  @Column({ nullable: true })
  max_uses: number;

  @Column({ default: 0 })
  current_uses: number;

  @Column({ type: 'timestamptz' })
  valid_from: Date;

  @Column({ type: 'timestamptz' })
  valid_until: Date;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.coupons)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
