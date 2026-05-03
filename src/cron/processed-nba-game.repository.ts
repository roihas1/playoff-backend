import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ProcessedNbaGame } from './processed-nba-game.entity';

@Injectable()
export class ProcessedNbaGameRepository extends Repository<ProcessedNbaGame> {
  private readonly logger = new Logger('ProcessedNbaGameRepository', {
    timestamp: true,
  });

  constructor(dataSource: DataSource) {
    super(ProcessedNbaGame, dataSource.createEntityManager());
  }

  async existsByGameId(externalGameId: string): Promise<boolean> {
    const count = await this.count({ where: { externalGameId } });
    return count > 0;
  }

  async markProcessed(
    externalGameId: string,
    seriesId: string,
  ): Promise<void> {
    const entity = this.create({
      externalGameId,
      seriesId,
      processedAt: new Date(),
    });
    try {
      await this.save(entity);
    } catch (error: any) {
      this.logger.error(
        `Failed to mark NBA game ${externalGameId} as processed: ${error?.message ?? error}`,
        error?.stack,
      );
      throw error;
    }
  }
}
