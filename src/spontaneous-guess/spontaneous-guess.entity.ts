import { Exclude, Expose } from 'class-transformer';
import { User } from 'src/auth/user.entity';
import { SpontaneousBet } from 'src/spontaneous-bet/spontaneousBet.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity()
@Unique(['bet', 'createdBy'])
export class SpontaneousGuess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SpontaneousBet, (spontaneousBet) => spontaneousBet.guesses, {
    eager: false,
    onDelete: 'SET NULL',
  })
  bet: SpontaneousBet;

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
