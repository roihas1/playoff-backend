import { User } from 'src/auth/user.entity';
import { PlayoffStage } from 'src/playoffs-stage/playoffs-stage.entity';
import { Conference } from 'src/series/conference.enum';
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

  @Column()
  team1: string;

  @Column()
  team2: string;

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
