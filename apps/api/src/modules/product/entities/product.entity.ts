import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Category } from '../../category/entities/category.entity';
import { ProductVariation } from './product-variation.entity';
import { ExtraGroup } from './extra-group.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenant_id: string;

  @Column()
  category_id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_price: number;

  @Column({ nullable: true })
  image_url: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  sort_order: number;

  @Column({ default: 0 })
  min_variations: number;

  @Column({ default: 0 })
  max_variations: number;

  @Column({ type: 'simple-json', nullable: true, default: '[]' })
  dietary_tags: string[];

  @ManyToOne(() => Tenant, (tenant) => tenant.products)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => ProductVariation, (variation) => variation.product, { cascade: true })
  variations: ProductVariation[];

  @ManyToMany(() => ExtraGroup)
  @JoinTable({
    name: 'product_extra_groups',
    joinColumn: { name: 'product_id' },
    inverseJoinColumn: { name: 'extra_group_id' },
  })
  extra_groups: ExtraGroup[];
}
