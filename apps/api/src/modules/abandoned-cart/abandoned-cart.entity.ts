import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from '../customer/entities/customer.entity';
import { Tenant } from '../tenant/entities/tenant.entity';

@Entity('abandoned_carts')
export class AbandonedCart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  customer_id: string;

  @Column({ type: 'simple-json' })
  items: any[]; // cart items snapshot

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ default: false })
  recovered: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  recovered_at: Date;

  @Column({ default: false })
  notification_sent: boolean;

  @Column('uuid')
  tenant_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
