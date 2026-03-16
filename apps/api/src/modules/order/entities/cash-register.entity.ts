import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { User } from '../../user/entities/user.entity';

@Entity('cash_registers')
export class CashRegister {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  opened_by: string;

  @Column({ nullable: true })
  closed_by: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  opening_balance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  closing_balance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_cash: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_credit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_debit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_pix: number;

  @Column({ default: 0 })
  orders_count: number;

  @Column({ type: 'text', nullable: true })
  closing_notes: string;

  @CreateDateColumn()
  opened_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;

  @Column({ default: true })
  is_open: boolean;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'opened_by' })
  opened_by_user: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'closed_by' })
  closed_by_user: User;
}
