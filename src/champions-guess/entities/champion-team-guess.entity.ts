import { User } from 'src/auth/user.entity';
import { PlayoffStage } from 'src/playoffs-stage/playoffs-stage.entity';
import { Team } from 'src/team/team.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity()
@Unique(['createdBy', 'stage'])
export class ChampionTeamGuess {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @ManyToOne(() => User, (user) => user.championTeamGuesses, { eager: false })
  createdBy: User;

  @ManyToOne(() => Team, { eager: false })
  @JoinColumn({ name: 'teamId' })
  teamRelation: Team;

  @Column({ nullable: true, default: 15 })
  fantasyPoints: number;

  @ManyToOne(() => PlayoffStage, (stage) => stage.championTeamGuesses)
  @JoinColumn()
  stage: PlayoffStage;

  // @Column({ type: 'date', nullable: true })
  // deadline: Date;
}
