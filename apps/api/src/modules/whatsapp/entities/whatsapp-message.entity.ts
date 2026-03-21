import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { WhatsappMessageTemplate } from './whatsapp-message-template.entity';
import { Order } from '../../order/entities/order.entity';
import {
  WhatsappMessageDirection,
  WhatsappMessageStatus,
} from '@menufacil/shared';

@Entity('whatsapp_messages')
export class WhatsappMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  customer_phone: string;

  @Column({ type: 'enum', enum: WhatsappMessageDirection })
  direction: WhatsappMessageDirection;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: WhatsappMessageStatus,
    default: WhatsappMessageStatus.SENT,
  })
  status: WhatsappMessageStatus;

  @Column({ nullable: true })
  template_id: string;

  @Column({ nullable: true })
  order_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => WhatsappMessageTemplate, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template: WhatsappMessageTemplate;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
