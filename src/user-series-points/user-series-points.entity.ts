// user-series-points.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/auth/user.entity';
import { Series } from 'src/series/series.entity';
import { Tournament } from 'src/tournament/tournament.entity';

@Entity()
@Unique(['user', 'series'])
export class UserSeriesPoints {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.seriesPoints, { eager: true })
  user: User;

  @ManyToOne(() => Series, (series) => series.userPoints, {
    eager: true,
    onDelete: 'CASCADE',
  })
  series: Series;

  @ManyToOne(() => Tournament, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament | null;

  @Column()
  points: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
