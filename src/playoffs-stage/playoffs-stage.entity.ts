import { ChampionTeamGuess } from 'src/champions-guess/entities/champion-team-guess.entity';
import { ConferenceFinalGuess } from 'src/champions-guess/entities/conference-final-guess.entity';
import { MVPGuess } from 'src/champions-guess/entities/mvp-guess.entity';
import { Tournament } from 'src/tournament/tournament.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';

@Entity()
@Unique(['name', 'tournament'])
export class PlayoffStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string; // e.g., 'Before Playoffs', 'Round 1', 'Round 2'

  @ManyToOne(() => Tournament, (tournament) => tournament.playoffStages, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

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
