import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('bet_stat_update')
@Index('UQ_bet_stat_update_betId_gameId', ['betId', 'gameId'], {
  unique: true,
})
export class BetStatUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  betId: string;

  @Column()
  gameId: string;

  @Column()
  gameDate: string;

  @Column()
  betKind: 'base' | 'spontaneous';

  @Column('text', { array: true, nullable: true })
  categories: string[] | null;

  @Column({ nullable: true })
  player1Name: string | null;

  @Column({ nullable: true })
  player2Name: string | null;

  @Column('float', { nullable: true })
  player1Value: number | null;

  @Column('float', { nullable: true })
  player2Value: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  appliedAt: Date;

  @Column('jsonb', { nullable: true })
  rawSource: Record<string, unknown> | null;
}
