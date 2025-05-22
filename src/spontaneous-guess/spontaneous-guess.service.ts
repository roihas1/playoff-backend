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
import { UpdateSpontaneousGuessesDto } from './dto/update-spontaneous-guess.dto';

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

      const found = await this.spontaneousGuessRepo.findOne({
        where: {
          createdBy: user,
          bet: { id: spontaneousBetId },
        },
      });
      if (found) {
        found.guess = guess;
        return await this.spontaneousGuessRepo.save(found);
      }
      const spontaneousBet =
        await this.spontaneousBetService.getBetByIdNoRelations(
          spontaneousBetId,
        );
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
  // spontaneous-guess.service.ts
  async getGuessesByUser(userId: string): Promise<SpontaneousGuess[]> {
    return this.spontaneousGuessRepo.find({
      where: { createdBy: { id: userId } },
      select: ['id', 'guess', 'betId'],
    });
  }
  async getUserGuessesForSeries(
    seriesId: string,
    userId: string,
  ): Promise<SpontaneousGuess[]> {
    return this.spontaneousGuessRepo
      .createQueryBuilder('guess')
      .leftJoinAndSelect('guess.bet', 'bet')
      .where('bet.seriesId = :seriesId', { seriesId })
      .andWhere('guess.createdById = :userId', { userId })
      .getMany();
  }

  async createOrUpdateGuesses(
    updateGuessesDto: UpdateSpontaneousGuessesDto,
    user: User,
  ): Promise<void> {
    try {
      const { spontaneousGuesses, seriesId } = updateGuessesDto;
      // const userGuesses = await this.getGuessesByUser(user.id);
      const seriesBets =
        await this.spontaneousBetService.getAllSeriesSpontaneousBets(seriesId);

      const seriesBetsIds = seriesBets.map((bet) => bet.id);

      for (const id of seriesBetsIds) {
        if (!(id in spontaneousGuesses)) {
          await this.spontaneousGuessRepo.delete({
            betId: id,
            createdBy: user,
          });
        }
      }

      await Promise.all(
        Array.from(
          Object.keys(spontaneousGuesses).map(async (key) => {
            return await this.createSpontaneousGuess(
              { guess: spontaneousGuesses[key], spontaneousBetId: key },
              user,
            );
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Failed to create or update new spontaneous guesses ${error.stack}`,
      );
      throw new InternalServerErrorException(
        `Failed to create or update new spontaneous guesses`,
      );
    }
  }
}
