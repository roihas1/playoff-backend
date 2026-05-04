import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * One row per NBA gameId from last-night-winners, so the same game is not
 * applied twice when the update runs before both daily slate passes.
 */
@Entity('series_game_update')
@Index('UQ_series_game_update_gameId', ['gameId'], { unique: true })
export class SeriesGameUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  gameId: string;

  @Column()
  gameDate: string;

  @Column()
  winnerTeamId: string;

  @Column({ nullable: true })
  seriesId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  appliedAt: Date;
}
