import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BestOf7Bet } from './bestOf7.entity';
import { Series } from 'src/series/series.entity';

@Injectable()
export class BestOf7BetRepository extends Repository<BestOf7Bet> {
  private logger = new Logger('BestOf7BetRepository', { timestamp: true });
  constructor(dataSource: DataSource) {
    super(BestOf7Bet, dataSource.createEntityManager());
  }

  async createBestOf7Bet(
    series: Series,
    fantasyPoints: number,
  ): Promise<BestOf7Bet> {
    const bestOf7Bet = this.create({
      series,
      fantasyPoints,
    });
    try {
      const savedBestOf7Bet = await this.save(bestOf7Bet);
      this.logger.verbose(
        `bestOf7Bet "${savedBestOf7Bet.id}" created successfully.`,
      );
      return savedBestOf7Bet;
    } catch (error) {
      this.logger.error(`Failed to create bestOf7Bet.`, error.stack);

      throw new InternalServerErrorException();
    }
  }
}
