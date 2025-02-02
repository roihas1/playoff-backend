import { ChampionTeamGuess } from 'src/champions-guess/entities/champion-team-guess.entity';
import { ConferenceFinalGuess } from 'src/champions-guess/entities/conference-final-guess.entity';
import { MVPGuess } from 'src/champions-guess/entities/mvp-guess.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
} from 'typeorm';

@Entity()
@Unique(['name'])
export class PlayoffStage {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @Column()
  name: string; // e.g., 'Before Playoffs', 'Round 1', 'Round 2'

  @Column({ type: 'date', nullable: true })
  startDate: Date;

  @Column({ type: 'time', nullable: true })
  timeOfStart: string;

  @OneToMany(() => ConferenceFinalGuess, (guess) => guess.stage)
  conferenceFinalGuesses: ConferenceFinalGuess[];

  @OneToMany(() => ChampionTeamGuess, (guess) => guess.stage)
  championTeamGuesses: ChampionTeamGuess[];

  @OneToMany(() => MVPGuess, (guess) => guess.stage)
  mvpGuesses: MVPGuess[];
}
