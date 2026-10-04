import {
  ForbiddenException,
  forwardRef,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SpontaneousGuessRepo } from './spontaneous-guess.repository';
import { SpontaneousGuess } from './spontaneous-guess.entity';
import { CreateSpontaneousGuessDto } from './dto/create-spontaneous-guess.dto';
import { User } from 'src/auth/user.entity';
import { SpontaneousBetService } from 'src/spontaneous-bet/spontaneous-bet.service';
import { SpontaneousBet } from 'src/spontaneous-bet/spontaneousBet.entity';
import { UpdateSpontaneousGuessesDto } from './dto/update-spontaneous-guess.dto';
import { UserMissingBetsService } from 'src/user-missing-bets/user-missing-bets.service';

@Injectable()
export class SpontaneousGuessService {
  private logger = new Logger('SpontaneousGuessService', { timestamp: true });
  constructor(
    private spontaneousGuessRepo: SpontaneousGuessRepo,
    private spontaneousBetService: SpontaneousBetService,
    @Inject(forwardRef(() => UserMissingBetsService))
    private readonly userMissingBetsService: UserMissingBetsService,
  ) {}

  private hasBetStarted(bet: Pick<SpontaneousBet, 'startTime'>): boolean {
    return !!bet.startTime && new Date(bet.startTime).getTime() <= Date.now();
  }

  private async upsertGuess(
    guess: number,
    bet: SpontaneousBet,
    user: User,
  ): Promise<SpontaneousGuess> {
    const found = await this.spontaneousGuessRepo.findOne({
      where: {
        createdBy: { id: user.id },
        bet: { id: bet.id },
      },
    });
    if (found) {
      found.guess = guess;
      return this.spontaneousGuessRepo.save(found);
    }
    return this.spontaneousGuessRepo.createSpontaneousGuess(guess, bet, user);
  }

  async createSpontaneousGuess(
    createSpontaneousGuessDto: CreateSpontaneousGuessDto,
    user: User,
  ): Promise<SpontaneousGuess> {
    const { guess, spontaneousBetId } = createSpontaneousGuessDto;
    this.logger.log(
      `User ${user.username} saving spontaneous guess. betId=${spontaneousBetId}`,
    );
    try {
      const spontaneousBet =
        await this.spontaneousBetService.getBetByIdNoRelations(
          spontaneousBetId,
        );
      if (this.hasBetStarted(spontaneousBet)) {
        throw new ForbiddenException(
          "You can't change a guess after the game has started.",
        );
      }
      const saved = await this.upsertGuess(guess, spontaneousBet, user);
      await this.userMissingBetsService.afterGuessWrite(user);
      this.logger.verbose(
        `User ${user.username} saved spontaneous guess. betId=${spontaneousBetId}`,
      );
      return saved;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to create new spontaneous guess for user ${user.username}, betId=${spontaneousBetId}`,
        error.stack,
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
      select: ['id', 'guess', 'betId', 'createdById'],
    });
  }

  async getGuessesByUserAndBetIds(
    userId: string,
    betIds: string[],
  ): Promise<SpontaneousGuess[]> {
    if (betIds.length === 0) {
      return [];
    }
    return this.spontaneousGuessRepo
      .createQueryBuilder('guess')
      .select(['guess.id', 'guess.guess', 'guess.betId', 'guess.createdById'])
      .where('guess.createdById = :userId', { userId })
      .andWhere('guess.betId IN (:...betIds)', { betIds })
      .getMany();
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
    const { spontaneousGuesses, seriesId } = updateGuessesDto;
    this.logger.log(
      `User ${user.username} updating spontaneous guesses. seriesId=${seriesId}, submitted=${Object.keys(spontaneousGuesses).length}`,
    );
    try {
      const seriesBets =
        await this.spontaneousBetService.getAllSeriesSpontaneousBets(seriesId);
      const openBets = new Map(
        seriesBets
          .filter((bet) => !this.hasBetStarted(bet))
          .map((bet) => [bet.id, bet]),
      );

      const ignoredIds = Object.keys(spontaneousGuesses).filter(
        (id) => !openBets.has(id),
      );
      if (ignoredIds.length > 0) {
        this.logger.warn(
          `User ${user.username} sent guesses for started or unknown spontaneous bets; ignoring them. seriesId=${seriesId}, betIds=${ignoredIds.join(',')}`,
        );
      }

      const idsToDelete = [...openBets.keys()].filter(
        (id) => !(id in spontaneousGuesses),
      );
      for (const id of idsToDelete) {
        await this.spontaneousGuessRepo.delete({
          betId: id,
          createdBy: { id: user.id },
        });
      }

      const idsToSave = Object.keys(spontaneousGuesses).filter((id) =>
        openBets.has(id),
      );
      await Promise.all(
        idsToSave.map((id) =>
          this.upsertGuess(spontaneousGuesses[id], openBets.get(id)!, user),
        ),
      );
      await this.userMissingBetsService.afterGuessWrite(user);
      this.logger.verbose(
        `User ${user.username} updated spontaneous guesses. seriesId=${seriesId}, saved=${idsToSave.length}, deleted=${idsToDelete.length}, ignored=${ignoredIds.length}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create or update spontaneous guesses for user ${user.username}, seriesId=${seriesId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to create or update new spontaneous guesses`,
      );
    }
  }
}
