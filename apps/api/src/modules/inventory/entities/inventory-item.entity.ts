import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  sku: string; // codigo interno

  @Column({ default: 'un' })
  unit: string; // un, kg, g, L, mL, pct

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_stock: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  min_stock: number; // alerta de estoque baixo

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cost_price: number; // preco de custo unitario

  @Column({ nullable: true })
  category: string; // categoria do insumo (ex: proteinas, hortifruti, bebidas)

  @Column({ nullable: true })
  supplier: string; // fornecedor

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;
}
