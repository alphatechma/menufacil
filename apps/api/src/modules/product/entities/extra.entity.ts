import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ExtraGroup } from './extra-group.entity';

@Entity('extras')
export class Extra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  group_id: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => ExtraGroup, (group) => group.extras)
  @JoinColumn({ name: 'group_id' })
  group: ExtraGroup;
}
