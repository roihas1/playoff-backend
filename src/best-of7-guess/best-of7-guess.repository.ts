import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BestOf7Guess } from './best-of7-guess.entity';
import { DataSource, Repository } from 'typeorm';
import { User } from 'src/auth/user.entity';
import { BestOf7Bet } from 'src/best-of7-bet/bestOf7.entity';

export type BestOf7GuessBucket = 4 | 5 | 6 | 7;

@Injectable()
export class BestOf7GuessRepository extends Repository<BestOf7Guess> {
  private logger = new Logger('BestOf7GuessRepository', { timestamp: true });
  constructor(dataSource: DataSource) {
    super(BestOf7Guess, dataSource.createEntityManager());
  }

  async createBestOf7Guess(
    guess: number,
    bestOf7Bet: BestOf7Bet,
    user: User,
  ): Promise<BestOf7Guess> {
    const bestOf7Guess = this.create({
      bet: bestOf7Bet,
      guess: guess,
      createdBy: user,
    });
    try {
      const savedBestOf7Guess = await this.save(bestOf7Guess);
      this.logger.verbose(
        `bestOf7Guess "${savedBestOf7Guess.id}" created successfully.`,
      );
      return savedBestOf7Guess;
    } catch (error) {
      this.logger.error(`Failed to create bestOf7Guess.`, error.stack);

      throw new InternalServerErrorException();
    }
  }

  async findBetAndUserByIds(
    betId: string,
    userId: string,
  ): Promise<BestOf7Guess> {
    const guess = await this.createQueryBuilder('bestOf7Guess')
      .leftJoinAndSelect('bestOf7Guess.bet', 'bestOf7Bet') // Correct join to bet relation
      .leftJoinAndSelect('bestOf7Guess.createdBy', 'user') // Correct join to user relation
      .where('bestOf7Bet.id = :betId AND user.id = :userId', { betId, userId })
      .getOne();

    if (!guess) {
      throw new NotFoundException('Bet and user not found');
    }

    return guess;
  }

  async getSeriesGuessCountsByValue(
    seriesId: string,
  ): Promise<Record<BestOf7GuessBucket, number>> {
    const rows = await this.createQueryBuilder('bestOf7Guess')
      .leftJoin('bestOf7Guess.bet', 'bestOf7Bet')
      .select('bestOf7Guess.guess', 'guess')
      .addSelect('COUNT(bestOf7Guess.id)', 'count')
      .where('bestOf7Bet.seriesId = :seriesId', { seriesId })
      .andWhere('bestOf7Guess.guess IN (:...validGuesses)', {
        validGuesses: [4, 5, 6, 7],
      })
      .groupBy('bestOf7Guess.guess')
      .getRawMany<{ guess: string; count: string }>();

    const result: Record<BestOf7GuessBucket, number> = {
      4: 0,
      5: 0,
      6: 0,
      7: 0,
    };

    for (const row of rows) {
      const guess = Number(row.guess);
      if (guess === 4 || guess === 5 || guess === 6 || guess === 7) {
        result[guess] = Number(row.count) || 0;
      }
    }

    return result;
  }
}
