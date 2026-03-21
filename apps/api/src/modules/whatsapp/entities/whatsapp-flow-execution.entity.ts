import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { FlowExecutionStatus } from '@menufacil/shared';
import { WhatsappFlow } from './whatsapp-flow.entity';

@Entity('whatsapp_flow_executions')
export class WhatsappFlowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  flow_id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column()
  customer_phone: string;

  @Column({ type: 'enum', enum: FlowExecutionStatus, default: FlowExecutionStatus.RUNNING })
  status: FlowExecutionStatus;

  @Column({ nullable: true })
  current_node_id: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  context: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => WhatsappFlow)
  @JoinColumn({ name: 'flow_id' })
  flow: WhatsappFlow;
}
