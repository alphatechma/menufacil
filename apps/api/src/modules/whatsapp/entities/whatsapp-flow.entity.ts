import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { FlowTriggerType } from '@menufacil/shared';
import { Tenant } from '../../tenant/entities/tenant.entity';

@Entity('whatsapp_flows')
export class WhatsappFlow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: FlowTriggerType })
  trigger_type: FlowTriggerType;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  trigger_config: Record<string, any>;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  nodes: any[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  edges: any[];

  @Column({ default: false })
  is_active: boolean;

  @Column({ default: 0 })
  priority: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
