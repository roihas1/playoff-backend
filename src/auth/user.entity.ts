import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './user-role.enum';
import { BestOf7Guess } from 'src/best-of7-guess/best-of7-guess.entity';
import { TeamWinGuess } from 'src/team-win-guess/team-win-guess.entity';
import { PlayerMatchupGuess } from 'src/player-matchup-guess/player-matchup-guess.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ default: 0 })
  fantasyPoints: number;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;

  @Column({ default: false })
  isActive: boolean;

  @OneToMany(() => BestOf7Guess, (bestOf7Guess) => bestOf7Guess.createdBy, {
    eager: true,
  })
  bestOf7Guesses: BestOf7Guess[];

  @OneToMany(() => TeamWinGuess, (teamWinGuess) => teamWinGuess.createdBy, {
    eager: true,
  })
  teamWinGuesses: TeamWinGuess[];

  @OneToMany(
    () => PlayerMatchupGuess,
    (playerMatchupGuess) => playerMatchupGuess.createdBy,
    {
      eager: true,
    },
  )
  playerMatchupGuesses: PlayerMatchupGuess[];
}
