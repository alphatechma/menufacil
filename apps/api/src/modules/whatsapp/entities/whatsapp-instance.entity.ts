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
import { WhatsappInstanceStatus } from '@menufacil/shared';

@Entity('whatsapp_instances')
export class WhatsappInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column({ unique: true })
  instance_name: string;

  @Column({
    type: 'enum',
    enum: WhatsappInstanceStatus,
    default: WhatsappInstanceStatus.DISCONNECTED,
  })
  status: WhatsappInstanceStatus;

  @Column({ nullable: true })
  phone_number: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
