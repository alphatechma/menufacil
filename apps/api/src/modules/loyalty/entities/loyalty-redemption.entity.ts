import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Customer } from '../../customer/entities/customer.entity';
import { LoyaltyReward } from './loyalty-reward.entity';

@Entity('loyalty_redemptions')
export class LoyaltyRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  customer_id: string;

  @Column()
  reward_id: string;

  @Column()
  points_spent: number;

  @Column({ nullable: true })
  coupon_code: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'used' | 'expired';

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  used_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => LoyaltyReward, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reward_id' })
  reward: LoyaltyReward;
}
