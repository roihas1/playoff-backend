import { User } from 'src/auth/user.entity';
import { BestOf7Bet } from '../best-of7-bet/bestOf7.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  Unique,
} from 'typeorm';
import { Exclude, Expose } from 'class-transformer';

@Entity()
@Unique(['createdBy', 'bet'])
export class BestOf7Guess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BestOf7Bet, (bestOf7Bet) => bestOf7Bet.guesses, {
    eager: false,
  })
  bet: BestOf7Bet;

  @ManyToOne(() => User, (user) => user.bestOf7Guesses, { eager: true })
  @Exclude({ toPlainOnly: true })
  createdBy: User;

  @Column()
  guess: number;

  @Expose() // Include only the user ID in the JSON output
  get createdById(): string {
    return this.createdBy?.id;
  }
  @RelationId((guess: BestOf7Guess) => guess.bet)
  betId: string;
}
