import { User } from 'src/auth/user.entity';
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { PrivateLeague } from './private-league.entity';

@Entity()
export class LeagueMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PrivateLeague, (league) => league.messages, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'leagueId' })
  league: PrivateLeague;

  @ManyToOne(() => User, (user) => user.leagueMessages, {
    nullable: false,
    eager: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ type: 'varchar', length: 420 })
  content: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
