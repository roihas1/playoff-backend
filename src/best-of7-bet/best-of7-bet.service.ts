import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BestOf7BetRepository } from './bestOf7.repository';
import { CreateBestOf7BetDto } from './dto/create-best-of7-bet.dto';
import { BestOf7Bet } from './bestOf7.entity';
import { UpdateResultDto } from './dto/update-result.dto';
import { UpdateFantasyPointsDto } from './dto/update-fantasy-points.dto';
import { SeriesService } from 'src/series/series.service';
import { AuthService } from 'src/auth/auth.service';
import { UpdateGameDto } from '../series/dto/update-game.dto';
import { User } from 'src/auth/user.entity';
import { BestOf7GuessService } from 'src/best-of7-guess/best-of7-guess.service';
import { BestOf7Guess } from 'src/best-of7-guess/best-of7-guess.entity';

@Injectable()
export class BestOf7BetService {
  private logger = new Logger('BestOf7BetService', { timestamp: true });
  constructor(
    private bestOf7BetRepository: BestOf7BetRepository,
    @Inject(forwardRef(() => SeriesService))
    private seriesService: SeriesService,
    private usersService: AuthService,
    @Inject(forwardRef(() => BestOf7GuessService))
    private bestOf7GuessService: BestOf7GuessService,
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
  async getAllBets(): Promise<
    {
      id: string;
      seriesId: string;
    }[]
  > {
    const raw = await this.bestOf7BetRepository
      .createQueryBuilder('bet')
      .innerJoin('bet.series', 'series')
      .select(['bet.id AS id', 'series.id AS "seriesId"'])
      .getRawMany();

    return raw;
  }
  async getActiveBets(): Promise<
    {
      id: string;
      fantasyPoints: number;
      seriesScore: number;
      result: number;
      seriesId: string;
    }[]
  > {
    const raw = await this.bestOf7BetRepository
      .createQueryBuilder('bet')
      .innerJoin('bet.series', 'series')
      .where('series.dateOfStart > :now', { now: new Date() })
      .select([
        'bet.id AS id',
        'bet.fantasyPoints AS fantasyPoints',
        'bet.seriesScore AS seriesScore',
        'bet.result AS result',
        'series.id AS "seriesId"',
      ])
      .getRawMany();

    return raw;
  }

  async getAllWithResults(): Promise<
    { id: string; result: number; seriesId: string; fantasyPoints: number }[]
  > {
    try {
      const raw = await this.bestOf7BetRepository
        .createQueryBuilder('bet')
        .leftJoin('bet.series', 'series')
        .select([
          'bet.id AS id',
          'bet.result AS result',
          'bet.fantasyPoints AS "fantasyPoints"',
          'series.id AS "seriesId"',
        ])
        .getRawMany();
      return raw;
    } catch (error) {
      this.logger.error(`faild to get all bets, series and results ${error}`);
      throw new InternalServerErrorException(
        `faild to get all bets, series and results`,
      );
    }
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
    try {
      const found = await this.getBestOf7betById(id);
      await Promise.all(
        found.guesses.map(async (guess) => {
          await this.bestOf7GuessService.deleteGuess(guess.id);
        }),
      );
      await this.bestOf7BetRepository.delete(found.id);
      this.logger.verbose(
        `best of 7 Bet with ID "${id}" successfully deleted.`,
      );
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
      this.logger.verbose(`BestOf7 Bet with ID "${id}" successfully updated.`);
      await Promise.all(
        savedBet.guesses.map(async (guess) => {
          if (guess.guess === savedBet.result) {
            await this.usersService.updateFantasyPoints(
              guess.createdBy,
              savedBet.fantasyPoints,
            );
          }
        }),
      );
      return savedBet;
    } catch (error) {
      this.logger.error(`Failed to update bet with ID: "${id}".`, error.stack);
      throw error;
    }
  }
  async updateResultForSeries(id: string): Promise<BestOf7Bet> {
    const bet = await this.getBestOf7betById(id);
    const games = bet.seriesScore[0] + bet.seriesScore[1];
    bet.result = games;
    try {
      const savedBet = await this.bestOf7BetRepository.save(bet);
      this.logger.verbose(`BestOf7 Bet with ID "${id}" successfully updated.`);

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
  async getUserGuess(
    bestOf7Bet: BestOf7Bet,
    userId: string,
  ): Promise<BestOf7Guess> {
    try {
      const guess = bestOf7Bet.guesses.filter((g) => g.createdById === userId);
      return guess[0];
    } catch (error) {
      this.logger.error(
        `Failed to get user guess for bet with ID: "${bestOf7Bet.id}" and user:${userId}.`,
        error.stack,
      );
      throw error;
    }
  }

  async updateGame(
    id: string,
    updateGame: UpdateGameDto,
    user: User,
  ): Promise<void> {
    const bet = await this.getBestOf7betById(id);
    const { teamWon } = updateGame;
    bet.seriesScore[teamWon - 1] += 1;
    try {
      await this.bestOf7BetRepository.save(bet);
      this.logger.verbose(
        `BestOf7Bet with ID "${id}" successfully updated series score.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update bet series score with ID: "${id}".`,
        error.stack,
      );
      throw error;
    }
  }
}
