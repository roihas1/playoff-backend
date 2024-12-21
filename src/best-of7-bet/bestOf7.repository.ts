import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BestOf7Bet } from './bestOf7.entity';
import { CreateBestOf7BetDto } from './dto/create-best-of7-bet.dto';

@Injectable()
export class BestOf7BetRepository extends Repository<BestOf7Bet> {
  private logger = new Logger('BestOf7BetRepository', { timestamp: true });
  constructor(dataSource: DataSource) {
    super(BestOf7Bet, dataSource.createEntityManager());
  }

  async createBestOf7Bet(
    createBestOf7BetDto: CreateBestOf7BetDto,
  ): Promise<BestOf7Bet> {
    const { seriesId, fantasyPoints } = createBestOf7BetDto;
    const bestOf7Bet = this.create({
      seriesId,
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
