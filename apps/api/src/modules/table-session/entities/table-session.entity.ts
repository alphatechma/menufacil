import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { RestaurantTable } from '../../table/entities/table.entity';

export enum SessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('table_sessions')
export class TableSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  table_id: string;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.OPEN })
  status: SessionStatus;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  opened_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;

  @Column({ nullable: true })
  opened_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => RestaurantTable)
  @JoinColumn({ name: 'table_id' })
  table: RestaurantTable;
}
