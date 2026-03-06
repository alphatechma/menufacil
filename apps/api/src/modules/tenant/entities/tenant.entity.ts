import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Plan } from '../../plan/entities/plan.entity';
import { User } from '../../user/entities/user.entity';
import { Category } from '../../category/entities/category.entity';
import { Product } from '../../product/entities/product.entity';
import { Customer } from '../../customer/entities/customer.entity';
import { Order } from '../../order/entities/order.entity';
import { DeliveryZone } from '../../delivery-zone/entities/delivery-zone.entity';
import { Coupon } from '../../coupon/entities/coupon.entity';
import { LoyaltyReward } from '../../loyalty/entities/loyalty-reward.entity';
import { ExtraGroup } from '../../product/entities/extra-group.entity';
import { DeliveryPerson } from '../../delivery-person/entities/delivery-person.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  logo_url: string;

  @Column({ nullable: true })
  banner_url: string;

  @Column({ nullable: true, default: '#FF6B35' })
  primary_color: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'jsonb', nullable: true })
  business_hours: Record<string, { open: boolean; openTime: string; closeTime: string }>;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  min_order_value: number;

  @Column({ type: 'jsonb', nullable: true, default: () => "'{\"sound_enabled\": true, \"sound_new_order\": true, \"sound_out_for_delivery\": true, \"sound_delivered\": true, \"push_enabled\": false}'" })
  notification_settings: {
    sound_enabled: boolean;
    sound_new_order: boolean;
    sound_out_for_delivery: boolean;
    sound_delivered: boolean;
    push_enabled: boolean;
  };

  @Column({ type: 'jsonb', nullable: true, default: () => "'{\"delivery\": true, \"pickup\": false, \"dine_in\": false}'" })
  order_modes: {
    delivery: boolean;
    pickup: boolean;
    dine_in: boolean;
  };

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  trial_ends_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  plan_id: string;

  @ManyToOne(() => Plan)
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Category, (category) => category.tenant)
  categories: Category[];

  @OneToMany(() => Product, (product) => product.tenant)
  products: Product[];

  @OneToMany(() => Customer, (customer) => customer.tenant)
  customers: Customer[];

  @OneToMany(() => Order, (order) => order.tenant)
  orders: Order[];

  @OneToMany(() => DeliveryZone, (zone) => zone.tenant)
  delivery_zones: DeliveryZone[];

  @OneToMany(() => Coupon, (coupon) => coupon.tenant)
  coupons: Coupon[];

  @OneToMany(() => LoyaltyReward, (reward) => reward.tenant)
  loyalty_rewards: LoyaltyReward[];

  @OneToMany(() => ExtraGroup, (group) => group.tenant)
  extra_groups: ExtraGroup[];

  @OneToMany(() => DeliveryPerson, (dp) => dp.tenant)
  delivery_persons: DeliveryPerson[];
}
