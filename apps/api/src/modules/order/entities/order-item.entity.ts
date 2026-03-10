import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { OrderItemExtra } from './order-item-extra.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  order_id: string;

  @Column()
  product_id: string;

  @Column({ nullable: true })
  variation_id: string;

  @Column()
  product_name: string;

  @Column({ nullable: true })
  variation_name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unit_price: number;

  @Column()
  quantity: number;

  @Column({ nullable: true })
  notes: string;

  @ManyToOne(() => Order, (order) => order.items)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @OneToMany(() => OrderItemExtra, (extra) => extra.order_item, { cascade: true })
  extras: OrderItemExtra[];
}
