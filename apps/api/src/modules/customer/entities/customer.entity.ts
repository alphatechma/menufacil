import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { CustomerAddress } from './customer-address.entity';
import { Order } from '../../order/entities/order.entity';

@Entity('customers')
@Unique(['phone', 'tenant_id'])
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  @Exclude()
  password_hash: string;

  @Column({ type: 'date', nullable: true })
  birth_date: string;

  @Column({ nullable: true })
  gender: string; // 'male' | 'female' | 'other' | 'prefer_not_to_say'

  @Column({ nullable: true })
  cpf: string;

  @Column({ default: 0 })
  loyalty_points: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.customers)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => CustomerAddress, (address) => address.customer)
  addresses: CustomerAddress[];

  @OneToMany(() => Order, (order) => order.customer)
  orders: Order[];
}
