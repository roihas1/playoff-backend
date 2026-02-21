import { User } from 'src/auth/user.entity';
import { PlayoffStage } from 'src/playoffs-stage/playoffs-stage.entity';
import { Conference } from 'src/series/conference.enum';
import { Team } from 'src/team/team.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  Unique,
} from 'typeorm';

@Entity()
@Unique(['conference', 'createdBy', 'stage'])
export class ConferenceFinalGuess {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @ManyToOne(() => User, (user) => user.conferenceFinalGuesses)
  createdBy: User;

  @ManyToOne(() => Team, { eager: false })
  @JoinColumn({ name: 'team1Id' })
  team1Relation: Team;

  @ManyToOne(() => Team, { eager: false })
  @JoinColumn({ name: 'team2Id' })
  team2Relation: Team;

  @Column({
    type: 'enum',
    enum: Conference,
  })
  conference: Conference;

  @Column({ nullable: true, default: 10 })
  fantasyPoints: number;

  @ManyToOne(() => PlayoffStage, (stage) => stage.conferenceFinalGuesses)
  @JoinColumn()
  stage: PlayoffStage;

  // @Column({ type: 'date', nullable: true })
  // deadline: Date;
}
