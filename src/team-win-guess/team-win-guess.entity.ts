import { Exclude, Expose } from 'class-transformer';
import { User } from '../auth/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  Unique,
} from 'typeorm';
import { TeamWinBet } from 'src/team-win-bet/team-win-bet.entity';

@Entity()
@Unique(['createdBy', 'bet'])
export class TeamWinGuess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TeamWinBet, (teamWinBet) => teamWinBet.guesses, {
    eager: false,
  })
  bet: TeamWinBet;

  @RelationId((guess: TeamWinGuess) => guess.bet)
  @Column({ select: true })
  betId: string;

  @ManyToOne(() => User, (user) => user.teamWinGuesses, { eager: true })
  @Exclude({ toPlainOnly: true })
  createdBy: User;

  @Column()
  guess: number; // 1/2

  @Expose() // Include only the user ID in the JSON output
  get createdById(): string {
    return this.createdBy?.id;
  }
}
