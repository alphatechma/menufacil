import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column()
  user_email: string;

  @Column()
  action: string;

  @Column()
  entity_type: string;

  @Column('uuid', { nullable: true })
  entity_id: string;

  @Column({ nullable: true })
  entity_name: string;

  @Column({ type: 'simple-json', nullable: true })
  details: Record<string, any>;

  @Column({ nullable: true })
  ip_address: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
