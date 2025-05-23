import {
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from './user-role.enum';
import { BestOf7Guess } from 'src/best-of7-guess/best-of7-guess.entity';
import { TeamWinGuess } from 'src/team-win-guess/team-win-guess.entity';
import { PlayerMatchupGuess } from 'src/player-matchup-guess/player-matchup-guess.entity';
import { ConferenceFinalGuess } from 'src/champions-guess/entities/conference-final-guess.entity';
import { ChampionTeamGuess } from 'src/champions-guess/entities/champion-team-guess.entity';
import { MVPGuess } from 'src/champions-guess/entities/mvp-guess.entity';
import { Exclude } from 'class-transformer';
import { PrivateLeague } from 'src/private-league/private-league.entity';
import { SpontaneousGuess } from 'src/spontaneous-guess/spontaneous-guess.entity';
import { UserSeriesPoints } from 'src/user-series-points/user-series-points.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  @Exclude()
  password: string;

  @Column({ default: 0 })
  fantasyPoints: number;

  @Column({ default: 0 })
  championPoints: number;

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

  @Column({ unique: true })
  @Exclude()
  email: string;

  @Column({ nullable: true })
  @Exclude()
  googleId: string;

  @Column({ default: false })
  isActive: boolean;

  @OneToMany(() => BestOf7Guess, (bestOf7Guess) => bestOf7Guess.createdBy, {
    eager: false,
  })
  bestOf7Guesses: BestOf7Guess[];

  @OneToMany(() => TeamWinGuess, (teamWinGuess) => teamWinGuess.createdBy, {
    eager: false,
  })
  teamWinGuesses: TeamWinGuess[];

  @OneToMany(
    () => PlayerMatchupGuess,
    (playerMatchupGuess) => playerMatchupGuess.createdBy,
    {
      eager: false,
    },
  )
  playerMatchupGuesses: PlayerMatchupGuess[];
  @OneToMany(
    () => SpontaneousGuess,
    (spontaneousGuess) => spontaneousGuess.createdBy,
    {
      eager: false,
    },
  )
  spontaneousGuesses: SpontaneousGuess[];

  @OneToMany(
    () => ConferenceFinalGuess,
    (conferenceFinalGuesses) => conferenceFinalGuesses.createdBy,
    {
      eager: false,
    },
  )
  conferenceFinalGuesses: ConferenceFinalGuess[];
  @OneToMany(
    () => ChampionTeamGuess,
    (championTeamGuesses) => championTeamGuesses.createdBy,
    {
      eager: false,
    },
  )
  championTeamGuesses: ChampionTeamGuess[];
  @OneToMany(() => MVPGuess, (mvpGuess) => mvpGuess.createdBy, {
    eager: false,
  })
  mvpGuesses: MVPGuess[];

  @ManyToMany(() => PrivateLeague, (privateLeague) => privateLeague.users, {
    eager: false,
  })
  privateLeagues: PrivateLeague[];

  @OneToMany(() => PrivateLeague, (league) => league.admin, {
    eager: false,
  })
  adminLeagues: PrivateLeague[];

  @OneToMany(() => UserSeriesPoints, (usp) => usp.user)
  seriesPoints: UserSeriesPoints[];
}
