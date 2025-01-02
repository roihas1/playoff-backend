import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BestOf7BetRepository } from './bestOf7.repository';
import { CreateBestOf7BetDto } from './dto/create-best-of7-bet.dto';
import { BestOf7Bet } from './bestOf7.entity';
import { UpdateResultDto } from './dto/update-result.dto';
import { UpdateFantasyPointsDto } from './dto/update-fantasy-points.dto';
import { SeriesService } from 'src/series/series.service';

@Injectable()
export class BestOf7BetService {
  private logger = new Logger('BestOf7BetService', { timestamp: true });
  constructor(
    private bestOf7BetRepository: BestOf7BetRepository,
    @Inject(forwardRef(() => SeriesService))
    private seriesService: SeriesService,
  ) {}

  async createBestOf7Bet(
    createBestOf7BetDto: CreateBestOf7BetDto,
  ): Promise<BestOf7Bet> {
    this.logger.verbose(`Trying to create bestOf7Bet.`);
    const series = await this.seriesService.getSeriesByID(
      createBestOf7BetDto.seriesId,
    );
    return await this.bestOf7BetRepository.createBestOf7Bet(
      series,
      createBestOf7BetDto.fantasyPoints,
    );
  }

  async getBestOf7betById(bestOf7BetId: string): Promise<BestOf7Bet> {
    const found = await this.bestOf7BetRepository.findOne({
      where: { id: bestOf7BetId },
      relations: ['guesses', 'guesses.createdBy'],
    });

    if (!found) {
      this.logger.error(`BestOf7Bet with ID ${bestOf7BetId} not found.`);
      throw new NotFoundException(
        `BestOf7Bet with ID ${bestOf7BetId} not found.`,
      );
    }
    return found;
  }

  async deleteBestOf7Bet(id: string): Promise<void> {
    const found = await this.getBestOf7betById(id);
    try {
      await this.bestOf7BetRepository.delete(found);
      this.logger.verbose(`Bet with ID "${id}" successfully deleted.`);
    } catch (error) {
      this.logger.error(`Failed to delete bet with ID: "${id}".`, error.stack);
      throw error;
    }
  }

  async updateResult(
    updateResultDto: UpdateResultDto,
    id: string,
  ): Promise<BestOf7Bet> {
    const bet = await this.getBestOf7betById(id);
    bet.result = updateResultDto.result;
    try {
      const savedBet = await this.bestOf7BetRepository.save(bet);
      this.logger.verbose(`Bet with ID "${id}" successfully updated.`);
      return savedBet;
    } catch (error) {
      this.logger.error(`Failed to update bet with ID: "${id}".`, error.stack);
      throw error;
    }
  }
  async updateFantasyPoints(
    updateFantasyPointsDto: UpdateFantasyPointsDto,
    id: string,
  ): Promise<BestOf7Bet> {
    const bet = await this.getBestOf7betById(id);
    bet.fantasyPoints = updateFantasyPointsDto.fantasyPoints;
    try {
      const savedBet = await this.bestOf7BetRepository.save(bet);
      this.logger.verbose(`Bet with ID "${id}" successfully updated.`);
      return savedBet;
    } catch (error) {
      this.logger.error(`Failed to update bet with ID: "${id}".`, error.stack);
      throw error;
    }
  }
}
