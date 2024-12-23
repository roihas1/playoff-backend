import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BestOf7GuessRepository } from './best-of7-guess.repository';
import { CreateBestOf7GuessDto } from './dto/create-best-of7-guess.dto';
import { BestOf7Guess } from './best-of7-guess.entity';
import { User } from '../auth/user.entity';
import { BestOf7BetService } from 'src/best-of7-bet/best-of7-bet.service';

@Injectable()
export class BestOf7GuessService {
  private logger = new Logger('BestOf7GuessService', { timestamp: true });
  constructor(
    private bestOf7GuessRepository: BestOf7GuessRepository,
    private bestOf7BetService: BestOf7BetService,
  ) {}

  async createBestOf7Guess(
    createBestOf7GuessDto: CreateBestOf7GuessDto,
    user: User,
  ): Promise<BestOf7Guess> {
    this.logger.verbose(`Trying to create bestOf7Guess.`);
    const { guess, bestOf7BetId } = createBestOf7GuessDto;
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
}
