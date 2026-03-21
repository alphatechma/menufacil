import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SystemModule } from '../../system-module/entities/system-module.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string; // e.g., 'product:create', 'order:read'

  @Column()
  name: string; // e.g., 'Criar Produto'

  @Column({ nullable: true })
  module_id: string;

  @ManyToOne(() => SystemModule)
  @JoinColumn({ name: 'module_id' })
  module: SystemModule;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
