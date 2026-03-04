import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Extra } from './extra.entity';

@Entity('extra_groups')
export class ExtraGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  min_select: number;

  @Column({ default: 1 })
  max_select: number;

  @Column({ default: false })
  is_required: boolean;

  @ManyToOne(() => Tenant, (tenant) => tenant.extra_groups)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => Extra, (extra) => extra.group, { cascade: true })
  extras: Extra[];
}
