import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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

  async getBestOf7betById(bestOf7BetId: string): Promise<BestOf7Bet> {
    const found = await this.bestOf7BetRepository.findOne({
      where: { id: bestOf7BetId },
    });

    if (!found) {
      this.logger.error(`BestOf7Bet with ID ${bestOf7BetId} not found.`);
      throw new NotFoundException(
        `BestOf7Bet with ID ${bestOf7BetId} not found.`,
      );
    }
    return found;
  }
}
