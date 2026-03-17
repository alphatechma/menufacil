import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { TenantUnit } from '../../unit/entities/tenant-unit.entity';
import { Order } from '../../order/entities/order.entity';
import { User } from '../../user/entities/user.entity';

@Entity('delivery_persons')
export class DeliveryPerson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column({ nullable: true })
  unit_id: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  vehicle: string;

  @Column({ nullable: true })
  user_id: string;

  @Column({ type: 'varchar', length: 20, default: 'none' })
  commission_type: string; // 'none' | 'fixed' | 'percent'

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commission_value: number;

  @Column({ type: 'boolean', default: false })
  receives_delivery_fee: boolean; // entregador recebe o valor da taxa de entrega

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.delivery_persons)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => TenantUnit, { nullable: true })
  @JoinColumn({ name: 'unit_id' })
  unit: TenantUnit;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Order, (order) => order.delivery_person)
  orders: Order[];
}
