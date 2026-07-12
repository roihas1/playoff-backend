import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BestOf7GuessBucket,
  BestOf7GuessRepository,
} from './best-of7-guess.repository';
import { CreateBestOf7GuessDto } from './dto/create-best-of7-guess.dto';
import { BestOf7Guess } from './best-of7-guess.entity';
import { User } from '../auth/user.entity';
import { Role } from '../auth/user-role.enum';
import { BestOf7BetService } from 'src/best-of7-bet/best-of7-bet.service';
import { BestOf7Bet } from 'src/best-of7-bet/bestOf7.entity';

@Injectable()
export class BestOf7GuessService {
  private logger = new Logger('BestOf7GuessService', { timestamp: true });
  constructor(
    private bestOf7GuessRepository: BestOf7GuessRepository,
    private bestOf7BetService: BestOf7BetService,
  ) {}

  private assertGuessOwnerOrAdmin(guess: BestOf7Guess, user: User): void {
    if (user.role === Role.ADMIN) {
      return;
    }
    if (guess.createdBy?.id !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to access this guess.',
      );
    }
  }

  async createBestOf7Guess(
    createBestOf7GuessDto: CreateBestOf7GuessDto,
    user: User,
  ): Promise<BestOf7Guess> {
    this.logger.verbose(`Trying to create bestOf7Guess.`);
    const { guess, bestOf7BetId } = createBestOf7GuessDto;

    const found = await this.bestOf7GuessRepository.findOne({
      where: {
        createdBy: { id: user.id },
        bet: { id: bestOf7BetId },
      },
    });
    if (found) {
      found.guess = guess;
      return await this.bestOf7GuessRepository.save(found);
    }
    const bestOf7Bet =
      await this.bestOf7BetService.getBestOf7betById(bestOf7BetId);
    return await this.bestOf7GuessRepository.createBestOf7Guess(
      guess,
      bestOf7Bet,
      user,
    );
  }

  async getGuessById(id: string): Promise<BestOf7Guess> {
    const found = await this.bestOf7GuessRepository.findOne({
      where: { id },
      relations: ['bet', 'createdBy'],
    });
    if (!found) {
      this.logger.error(`BestOf7Guess with ID ${id} not found.`);
      throw new NotFoundException(`BestOf7Bet with ID ${id} not found.`);
    }
    this.logger.verbose(`BestOf7Guess with ID: ${id} retrieved succesfully.`);
    return found;
  }

  async getGuessByIdForUser(id: string, user: User): Promise<BestOf7Guess> {
    const found = await this.getGuessById(id);
    this.assertGuessOwnerOrAdmin(found, user);
    return found;
  }

  async getGuessesByUser(userId: string): Promise<BestOf7Guess[]> {
    return this.bestOf7GuessRepository.find({
      where: { createdBy: { id: userId } },
      select: ['id', 'guess', 'betId'],
    });
  }

  async getSeriesGuessCountsByValue(
    seriesId: string,
  ): Promise<Record<BestOf7GuessBucket, number>> {
    return this.bestOf7GuessRepository.getSeriesGuessCountsByValue(seriesId);
  }

  async getGuessByBet(
    bestOf7Bet: BestOf7Bet,
    user: User,
  ): Promise<BestOf7Guess> {
    // console.log(JSON.stringify(bestOf7Bet), JSON.stringify(user));
    // const found = await this.bestOf7GuessRepository.findOne({
    //   where: { bet: bestOf7Bet, createdBy: user },
    //   relations: ['bet', 'createdBy'],
    // });
    const found = await this.bestOf7GuessRepository.findBetAndUserByIds(
      bestOf7Bet.id,
      user.id,
    );

    if (!found) {
      this.logger.error(
        `User ${user.id} attempt to get a BestOf7Guess for bet with ID ${bestOf7Bet.id} not found.`,
      );
      throw new NotFoundException(
        `BestOf7Guess for bet with ID ${bestOf7Bet.id} not found.`,
      );
    }
    this.logger.verbose(
      `BestOf7Guess for bet with ID: ${bestOf7Bet.id} retrieved succesfully.`,
    );
    return found;
  }

  async updateGuess(
    id: string,
    guess: number,
    user: User,
  ): Promise<BestOf7Guess> {
    const found = await this.getGuessById(id);
    this.assertGuessOwnerOrAdmin(found, user);

    found.guess = guess;
    return await this.bestOf7GuessRepository.save(found);
  }
  async updateGuessByBet(
    bestOf7Bet: BestOf7Bet,
    guess: number,
    user: User,
  ): Promise<BestOf7Guess> {
    const found = await this.getGuessByBet(bestOf7Bet, user);
    found.guess = guess;
    return await this.bestOf7GuessRepository.save(found);
  }

  async deleteGuess(id: string, user?: User): Promise<void> {
    const found = await this.getGuessById(id);
    if (user) {
      this.assertGuessOwnerOrAdmin(found, user);
    }
    try {
      await this.bestOf7GuessRepository.delete(found);
      this.logger.verbose(`BestOf7Guess with ID: ${id} deleted succesfully.`);
      return;
    } catch (error) {
      this.logger.error(`BestOf7Guess with ID: ${id} did not delete.`);
      throw new InternalServerErrorException(
        `BestOf7Guess with ID: ${id} did not delete.`,
      );
    }
  }
}
