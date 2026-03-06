import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '@menufacil/shared';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Customer } from '../../customer/entities/customer.entity';
import { DeliveryPerson } from '../../delivery-person/entities/delivery-person.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column({ nullable: true })
  customer_id: string;

  @Column()
  order_number: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: OrderType, default: OrderType.DELIVERY })
  order_type: OrderType;

  @Column({ nullable: true })
  table_id: string;

  @Column({ nullable: true })
  table_session_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  delivery_fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  payment_method: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  payment_status: PaymentStatus;

  @Column({ type: 'jsonb', nullable: true })
  address_snapshot: Record<string, unknown>;

  @Column({ nullable: true })
  delivery_person_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  change_for: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'timestamp', nullable: true })
  confirmed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  preparing_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  ready_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  out_for_delivery_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  delivered_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  picked_up_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  served_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.orders)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Customer, (customer) => customer.orders)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => DeliveryPerson, (dp) => dp.orders)
  @JoinColumn({ name: 'delivery_person_id' })
  delivery_person: DeliveryPerson;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
