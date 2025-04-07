import { User } from 'src/auth/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class UserMissingBet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  betId: string;

  @Column()
  betType: 'teamWin' | 'bestOf7' | 'playerMatchup' | 'spontaneous';

  @Column()
  seriesId: string;

  @Column('jsonb') // PostgreSQL jsonb for fast indexed queries if needed
  details: {
    seriesName: string; // Lakers vs Celtics
    player1?: string;
    player2?: string;
    category?: string;
    gameNumber?: number;
    startTime?: Date;
    team1?: string;
    team2?: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
