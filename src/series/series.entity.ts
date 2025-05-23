import { BestOf7Bet } from 'src/best-of7-bet/bestOf7.entity';
import { PlayerMatchupBet } from 'src/player-matchup-bet/player-matchup-bet.entity';
import { TeamWinBet } from 'src/team-win-bet/team-win-bet.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Conference } from './conference.enum';
import { Round } from './round.enum';
import { SpontaneousBet } from 'src/spontaneous-bet/spontaneousBet.entity';
import { UserSeriesPoints } from 'src/user-series-points/user-series-points.entity';

@Entity()
export class Series {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  team1: string;

  @Column()
  team2: string;
  @Column({ nullable: true })
  seed1: number;
  @Column({ nullable: true })
  seed2: number;
  @Column({
    type: 'enum',
    enum: Conference,
  })
  conference: Conference;
  @Column({
    type: 'timestamptz',
    nullable: true,
    default: () => "CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem'",
  })
  lastUpdate: Date;

  @Column({
    type: 'enum',
    enum: Round,
  })
  round: Round;

  @Column({ type: 'date' })
  dateOfStart: Date;
  @Column({ type: 'time', nullable: true })
  timeOfStart: string;

  @OneToOne(() => BestOf7Bet, (bestOf7Bet) => bestOf7Bet.series, {
    eager: true,
    cascade: true,
  })
  bestOf7BetId: BestOf7Bet;

  @OneToOne(() => TeamWinBet, (teamWinBet) => teamWinBet.seriesId, {
    eager: true,
    cascade: true,
  })
  teamWinBetId: TeamWinBet;

  @OneToMany(
    () => PlayerMatchupBet,
    (playerMatchupBet) => playerMatchupBet.seriesId,
    {
      cascade: true, // Automatically saves related PlayerMatchupBet entities
      eager: true, // Automatically loads related PlayerMatchupBet entities
    },
  )
  playerMatchupBets: PlayerMatchupBet[];
  @OneToMany(
    () => SpontaneousBet,
    (spontaneousBet) => spontaneousBet.seriesId,
    {
      cascade: true, // Automatically saves related PlayerMatchupBet entities
      eager: true, // Automatically loads related PlayerMatchupBet entities
    },
  )
  spontaneousBets: SpontaneousBet[];
  @OneToMany(() => UserSeriesPoints, (usp) => usp.series)
  userPoints: UserSeriesPoints[];
}
