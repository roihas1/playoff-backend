import { TeamWinGuess } from 'src/team-win-guess/team-win-guess.entity';
import { Series } from '../series/series.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity()
export class TeamWinBet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Series, (series) => series.teamWinBetId, { eager: false })
  @JoinColumn()
  seriesId: string;

  @Column()
  fantasyPoints: number;

  @Column({ default: '' })
  result: string;

  @OneToMany(() => TeamWinGuess, (teamWinGuess) => teamWinGuess.bet, {
    eager: true,
  })
  guesses: TeamWinGuess[];
}
