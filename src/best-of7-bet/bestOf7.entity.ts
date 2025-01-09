import { BestOf7Guess } from 'src/best-of7-guess/best-of7-guess.entity';
import { Series } from '../series/series.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class BestOf7Bet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Series, (series) => series.bestOf7BetId, { eager: false })
  @JoinColumn()
  series: Series;

  @Column({ default: 4 })
  fantasyPoints: number;
  @OneToMany(() => BestOf7Guess, (bestOf7Guess) => bestOf7Guess.bet, {
    eager: true,
  })
  guesses: BestOf7Guess[];

  @Column('int', { array: true, nullable: true })
  seriesScore: number[];

  @Column({ default: 0 })
  result: number;
}
