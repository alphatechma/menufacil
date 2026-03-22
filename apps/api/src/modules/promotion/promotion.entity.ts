import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../tenant/entities/tenant.entity';

export enum PromotionType {
  COMBO = 'combo',
  HAPPY_HOUR = 'happy_hour',
  WEEKDAY = 'weekday',
  BUY_X_GET_Y = 'buy_x_get_y',
  DISCOUNT = 'discount',
}

export enum PromotionDiscountType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: PromotionType })
  type: PromotionType;

  @Column({ type: 'simple-json', nullable: true })
  rules: {
    products?: string[];
    categories?: string[];
    buy_quantity?: number;
    get_quantity?: number;
    min_order_value?: number;
  };

  @Column({ type: 'simple-json', nullable: true })
  schedule: {
    days?: number[];
    start_time?: string;
    end_time?: string;
  };

  @Column({ type: 'enum', enum: PromotionDiscountType })
  discount_type: PromotionDiscountType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discount_value: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  valid_from: Date;

  @Column({ type: 'timestamptz', nullable: true })
  valid_to: Date;

  @Column('uuid')
  tenant_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
