import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RewardType } from '@menufacil/shared';
import { Tenant } from '../../tenant/entities/tenant.entity';

@Entity('loyalty_rewards')
export class LoyaltyReward {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  points_required: number;

  @Column({ type: 'enum', enum: RewardType })
  reward_type: RewardType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  reward_value: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  max_redemptions_per_customer: number;

  @Column({ default: 24 })
  cooldown_hours: number;

  @Column({ default: 72 })
  expiration_hours: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.loyalty_rewards)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
