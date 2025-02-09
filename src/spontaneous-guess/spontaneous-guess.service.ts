import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SpontaneousGuessRepo } from './spontaneous-guess.repository';
import { SpontaneousGuess } from './spontaneous-guess.entity';
import { CreateSpontaneousGuessDto } from './dto/create-spontaneous-guess.dto';
import { User } from 'src/auth/user.entity';
import { SpontaneousBetService } from 'src/spontaneous-bet/spontaneous-bet.service';

@Injectable()
export class SpontaneousGuessService {
  private logger = new Logger('SpontaneousGuessService', { timestamp: true });
  constructor(
    private spontaneousGuessRepo: SpontaneousGuessRepo,
    private spontaneousBetService: SpontaneousBetService,
  ) {}

  async createSpontaneousGuess(
    createSpontaneousGuessDto: CreateSpontaneousGuessDto,
    user: User,
  ): Promise<SpontaneousGuess> {
    try {
      const { guess, spontaneousBetId } = createSpontaneousGuessDto;
      const spontaneousBet =
        await this.spontaneousBetService.getBetById(spontaneousBetId);
      const found = await this.spontaneousGuessRepo.findOne({
        where: {
          createdBy: user,
          bet: spontaneousBet,
        },
      });
      if (found) {
        found.guess = guess;
        return await this.spontaneousGuessRepo.save(found);
      }
      return await this.spontaneousGuessRepo.createSpontaneousGuess(
        guess,
        spontaneousBet,
        user,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create new spontaneous guess ${error.stack}`,
      );
      throw new InternalServerErrorException(
        `Failed to create new spontaneous guess`,
      );
    }
  }
}
