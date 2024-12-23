import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { BestOf7Guess } from './best-of7-guess.entity';
import { DataSource, Repository } from 'typeorm';
import { User } from 'src/auth/user.entity';
import { BestOf7Bet } from 'src/best-of7-bet/bestOf7.entity';

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
    const existingGuess = await this.findOne({
      where: {
        bet: bestOf7Bet,
        createdBy: user,
      },
    });

    if (existingGuess) {
      this.logger.error(
        `User ${user.id} have already made a guess for the bet with id ${bestOf7Bet.id}.`,
      );
      throw new ConflictException(
        `User ${user.id} have already made a guess for the bet with id ${bestOf7Bet.id}.`,
      );
    }

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
}
