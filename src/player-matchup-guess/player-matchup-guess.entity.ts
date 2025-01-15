import { Exclude, Expose } from 'class-transformer';
import { User } from 'src/auth/user.entity';
import { PlayerMatchupBet } from 'src/player-matchup-bet/player-matchup-bet.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity()
@Unique(['bet', 'createdBy'])
export class PlayerMatchupGuess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => PlayerMatchupBet,
    (playerMatchupBet) => playerMatchupBet.guesses,
    { eager: false, onDelete: 'SET NULL' },
  )
  bet: PlayerMatchupBet;

  @ManyToOne(() => User, (user) => user.playerMatchupGuesses, { eager: true })
  @Exclude({ toPlainOnly: true })
  createdBy: User;

  @Column()
  guess: number; // 1/2

  @Expose() // Include only the user ID in the JSON output
  get createdById(): string {
    return this.createdBy?.id;
  }
}
