import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity('order_item_extras')
export class OrderItemExtra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  order_item_id: string;

  @Column()
  extra_name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  extra_price: number;

  @ManyToOne(() => OrderItem, (item) => item.extras)
  @JoinColumn({ name: 'order_item_id' })
  order_item: OrderItem;
}
