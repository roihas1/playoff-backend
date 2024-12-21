import { Injectable, Logger } from '@nestjs/common';
import { BestOf7BetRepository } from './bestOf7.repository';
import { CreateBestOf7BetDto } from './dto/create-best-of7-bet.dto';
import { BestOf7Bet } from './bestOf7.entity';

@Injectable()
export class BestOf7BetService {
  private logger = new Logger('BestOf7BetService', { timestamp: true });
  constructor(private bestOf7BetRepository: BestOf7BetRepository) {}

  async createBestOf7Bet(
    createBestOf7BetDto: CreateBestOf7BetDto,
  ): Promise<BestOf7Bet> {
    this.logger.verbose(`Trying to create bestOf7Bet.`);
    return await this.bestOf7BetRepository.createBestOf7Bet(
      createBestOf7BetDto,
    );
  }
}
