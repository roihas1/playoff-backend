import { Series } from '../series/series.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class BestOf7Bet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Series, (series) => series.bestOf7BetId, { eager: false })
  @JoinColumn()
  seriesId: string;

  @Column()
  fantasyPoints: number;

  @Column({ default: 0 })
  result: number;
}
