import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/auth/user.entity';
import { Tournament } from 'src/tournament/tournament.entity';

@Entity()
@Unique(['user', 'tournament'])
export class UserTournamentPoints {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.tournamentPoints, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(
    () => Tournament,
    (tournament) => tournament.userTournamentPoints,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @Column({ type: 'int', default: 0 })
  fantasyPoints: number;

  @Column({ type: 'int', default: 0 })
  championPoints: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
