import { User } from 'src/auth/user.entity';
import { PlayoffStage } from 'src/playoffs-stage/playoffs-stage.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  Unique,
} from 'typeorm';

@Entity()
@Unique(['createdBy', 'stage'])
export class MVPGuess {
  @PrimaryGeneratedColumn('uuid')
  id: number;

  @ManyToOne(() => User, (user) => user.mvpGuesses)
  createdBy: User;

  @Column()
  player: string; // The selected MVP player

  @Column({ nullable: true, default: 5 })
  fantasyPoints: number;

  @ManyToOne(() => PlayoffStage, (stage) => stage.mvpGuesses)
  @JoinColumn()
  stage: PlayoffStage;

  // @Column({ type: 'date', nullable: true })
  // deadline: Date;
}
