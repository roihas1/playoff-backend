import { BestOf7Bet } from 'src/best-of7-bet/bestOf7.entity';
import { PlayerMatchupBet } from 'src/player-matchup-bet/player-matchup-bet.entity';
import { TeamWinBet } from 'src/team-win-bet/team-win-bet.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Coast } from './Coast.enum';
import { Round } from './round.enum';

@Entity()
export class Series {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  team1: string;

  @Column()
  team2: string;

  @Column({
    type: 'enum',
    enum: Coast,
  })
  coast: Coast;

  @Column({
    type: 'enum',
    enum: Round,
  })
  round: Round;

  @Column({ type: 'date' })
  dateOfStart: Date;

  @OneToOne(() => BestOf7Bet, (bestOf7Bet) => bestOf7Bet.seriesId, {
    eager: true,
  })
  @JoinColumn()
  bestOf7BetId: string;

  @OneToOne(() => TeamWinBet, (teamWinBet) => teamWinBet.seriesId, {
    eager: true,
  })
  @JoinColumn()
  teamWinBetId: string;

  @OneToMany(
    () => PlayerMatchupBet,
    (playerMatchupBet) => playerMatchupBet.seriesId,
    {
      cascade: true, // Automatically saves related PlayerMatchupBet entities
      eager: true, // Automatically loads related PlayerMatchupBet entities
    },
  )
  playerMatchupBets: PlayerMatchupBet[];
}
