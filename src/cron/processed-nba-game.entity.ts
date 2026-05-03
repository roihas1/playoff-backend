import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity()
export class ProcessedNbaGame {
  @PrimaryColumn({ type: 'varchar' })
  externalGameId: string;

  @Column({ type: 'uuid' })
  @Index()
  seriesId: string;

  @Column({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  processedAt: Date;
}
