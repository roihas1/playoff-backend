import { Series } from '../series/series.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { PlayerMatchupType } from './player-matchup-type.enum';
import { MatchupCategory } from './matchup-category.enum';

@Entity()
export class PlayerMatchupBet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Series, (series) => series.playerMatchupBets, {
    eager: false,
  })
  @JoinColumn()
  seriesId: string;

  @Column({
    type: 'enum',
    enum: PlayerMatchupType,
  })
  typeOfMatchup: PlayerMatchupType;

  @Column({
    type: 'enum',
    enum: MatchupCategory,
    array: true,
  })
  categories: MatchupCategory[];

  @Column()
  fantasyPoints: number;

  @Column()
  player1: string;

  @Column()
  player2: string;

  @Column()
  differential: number; // for player 1

  @Column({ nullable: true })
  result: number;
}
