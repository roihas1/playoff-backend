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
import { Exclude } from 'class-transformer';

@Entity()
@Unique(['createdBy', 'bet'])
export class BestOf7Guess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BestOf7Bet, (bestOf7Bet) => bestOf7Bet.guesses, {
    eager: false,
  })
  bet: BestOf7Bet;

  @ManyToOne(() => User, (user) => user.bestOf7Guesses, { eager: false })
  @Exclude({ toPlainOnly: true })
  createdBy: User;

  @Column()
  guess: number;

  @RelationId((guess: BestOf7Guess) => guess.createdBy)
  @Column({ select: true })
  createdById: string;
  @RelationId((guess: BestOf7Guess) => guess.bet)
  @Column({ select: true })
  betId: string;
}
