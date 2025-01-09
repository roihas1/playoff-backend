import { Series } from '../series/series.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { PlayerMatchupType } from './player-matchup-type.enum';
import { MatchupCategory } from './matchup-category.enum';
import { PlayerMatchupGuess } from 'src/player-matchup-guess/player-matchup-guess.entity';

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

  @Column({ default: 2 })
  fantasyPoints: number;

  @Column()
  player1: string;

  @Column()
  player2: string;

  @Column()
  differential: number; // for player 1

  @Column({ nullable: true })
  result: number;
  @Column('int', { array: true, nullable: true, default: [0, 0] })
  currentStats: number[];

  @OneToMany(
    () => PlayerMatchupGuess,
    (playerMatchupGuess) => playerMatchupGuess.bet,
    { eager: true },
  )
  guesses: PlayerMatchupGuess[];
}
