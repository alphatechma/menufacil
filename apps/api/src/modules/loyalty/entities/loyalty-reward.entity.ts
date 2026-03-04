import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
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

  @Column()
  points_required: number;

  @Column({ type: 'enum', enum: RewardType })
  reward_type: RewardType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  reward_value: number;

  @ManyToOne(() => Tenant, (tenant) => tenant.loyalty_rewards)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
