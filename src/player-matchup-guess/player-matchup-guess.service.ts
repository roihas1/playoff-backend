import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PlayerMatchupGuessRepository } from './player-matchup-guess.repository';
import { CreatePlayerMatchupGuessDto } from './dto/create-player-matchup-guess.dto';
import { User } from 'src/auth/user.entity';
import { Role } from 'src/auth/user-role.enum';
import { PlayerMatchupGuess } from './player-matchup-guess.entity';
import { PlayerMatchupBetService } from 'src/player-matchup-bet/player-matchup-bet.service';
import { UpdateGuessDto } from './dto/update-guess.dto';
import { PlayerMatchupBet } from 'src/player-matchup-bet/player-matchup-bet.entity';
import { In } from 'typeorm';
import { UserMissingBetsService } from 'src/user-missing-bets/user-missing-bets.service';

@Injectable()
export class PlayerMatchupGuessService {
  private logger = new Logger('PlayerMatchupGuessService', { timestamp: true });
  constructor(
    private playerMatchupGuessRepository: PlayerMatchupGuessRepository,
    private playerMatchupBetService: PlayerMatchupBetService,
    @Inject(forwardRef(() => UserMissingBetsService))
    private readonly userMissingBetsService: UserMissingBetsService,
  ) {}

  private assertGuessOwnerOrAdmin(guess: PlayerMatchupGuess, user: User): void {
    if (user.role === Role.ADMIN) {
      return;
    }
    if (guess.createdById !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to access this guess.',
      );
    }
  }

  async createPlayerMatchupGuess(
    createPlayerMatchGuessDto: CreatePlayerMatchupGuessDto,
    user: User,
  ): Promise<PlayerMatchupGuess> {
    this.logger.verbose(`Trying to create PlayerMatchupGuess.`);
    const { guess, playerMatchupBetId } = createPlayerMatchGuessDto;

    const found = await this.playerMatchupGuessRepository.findOne({
      where: {
        createdBy: { id: user.id },
        bet: { id: playerMatchupBetId },
      },
    });
    if (found) {
      found.guess = guess;
      const saved = await this.playerMatchupGuessRepository.save(found);
      await this.userMissingBetsService.afterGuessWrite(user);
      return saved;
    }
    const playerMatchupBet =
      await this.playerMatchupBetService.getPlayerMatchupBetByIdNoGuesses(
        playerMatchupBetId,
      );
    const created =
      await this.playerMatchupGuessRepository.createPlayerMatchupGuess(
        guess,
        playerMatchupBet,
        user,
      );
    await this.userMissingBetsService.afterGuessWrite(user);
    return created;
  }
  async getUserGuessesForSeries(
    seriesId: string,
    userId: string,
  ): Promise<PlayerMatchupGuess[]> {
    return this.playerMatchupGuessRepository
      .createQueryBuilder('guess')
      .leftJoinAndSelect('guess.bet', 'bet')
      .where('bet.seriesId = :seriesId', { seriesId })
      .andWhere('guess.createdById = :userId', { userId })
      .getMany();
  }

  async createManyPlayerMatchupGuesses(
    guessesDto: CreatePlayerMatchupGuessDto[],
    user: User,
  ): Promise<void> {
    this.logger.verbose(
      `Creating ${guessesDto.length} PlayerMatchupGuesses...`,
    );

    // Fetch all existing guesses in one query
    const betIds = guessesDto.map((dto) => dto.playerMatchupBetId);
    const existingGuesses = await this.playerMatchupGuessRepository.find({
      where: {
        createdBy: { id: user.id },
        bet: { id: In(betIds) },
      },
      relations: ['bet'],
    });

    const existingMap = new Map(
      existingGuesses.map((guess) => [guess.bet.id, guess]),
    );

    const guessesToSave = await Promise.all(
      guessesDto.map(async (dto) => {
        const existing = existingMap.get(dto.playerMatchupBetId);
        if (existing) {
          existing.guess = dto.guess;
          return existing;
        } else {
          const bet =
            await this.playerMatchupBetService.getPlayerMatchupBetByIdNoGuesses(
              dto.playerMatchupBetId,
            );
          return this.playerMatchupGuessRepository.createPlayerMatchupGuessEntity(
            dto.guess,
            bet,
            user,
          );
        }
      }),
    );

    await this.playerMatchupGuessRepository.save(guessesToSave);
    await this.userMissingBetsService.afterGuessWrite(user);
  }

  async getGuessesByUser(userId: string): Promise<PlayerMatchupGuess[]> {
    return this.playerMatchupGuessRepository.find({
      where: { createdBy: { id: userId } },
      select: ['id', 'guess', 'betId', 'createdById'],
    });
  }

  async getGuessesByUserAndBetIds(
    userId: string,
    betIds: string[],
  ): Promise<PlayerMatchupGuess[]> {
    if (betIds.length === 0) {
      return [];
    }
    return this.playerMatchupGuessRepository
      .createQueryBuilder('guess')
      .select(['guess.id', 'guess.guess', 'guess.betId', 'guess.createdById'])
      .where('guess.createdById = :userId', { userId })
      .andWhere('guess.betId IN (:...betIds)', { betIds })
      .getMany();
  }

  async getPlayerMatcupGuessById(id: string): Promise<PlayerMatchupGuess> {
    const found = await this.playerMatchupGuessRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });
    if (!found) {
      this.logger.error(`PlayerMatchupGuess with ID ${id} not found.`);
      throw new NotFoundException(
        `PlayerMatchupGuess with ID ${id} not found.`,
      );
    }
    return found;
  }
  async getPlayerMatcupGuessByBet(
    playerMatchupBet: PlayerMatchupBet,
    user: User,
  ): Promise<PlayerMatchupGuess> {
    const found = await this.playerMatchupGuessRepository.findOne({
      where: {
        bet: { id: playerMatchupBet.id }, // Reference to the bet by betId
        createdBy: { id: user.id }, // Reference to the user by userId
      },
      relations: ['bet', 'createdBy'], // Ensure relations are loaded
    });

    if (!found) {
      this.logger.error(
        `PlayerMatchupGuess for bet with ID ${playerMatchupBet.id} not found.`,
      );
      throw new NotFoundException(
        `PlayerMatchupGuess for bet with ID ${playerMatchupBet.id} not found.`,
      );
    }
    return found;
  }
  async updateGuess(
    id: string,
    updateGuessDto: UpdateGuessDto,
    user: User,
  ): Promise<PlayerMatchupGuess> {
    const bet = await this.getPlayerMatcupGuessById(id);
    if (!bet) {
      return await this.createPlayerMatchupGuess(
        { guess: updateGuessDto.guess, playerMatchupBetId: id },
        user,
      );
    }
    this.assertGuessOwnerOrAdmin(bet, user);
    bet.guess = updateGuessDto.guess;

    try {
      const savedBet = await this.playerMatchupGuessRepository.save(bet);
      this.logger.verbose(`Bet with ID "${id}" successfully updated.`);
      await this.userMissingBetsService.afterGuessWrite(user);
      return savedBet;
    } catch (error) {
      this.logger.error(`Failed to update bet with ID: "${id}".`, error.stack);
      throw error;
    }
  }
  async updateGuessByBet(
    playerMatchupBet: PlayerMatchupBet,
    updateGuessDto: UpdateGuessDto,
    user: User,
  ): Promise<PlayerMatchupGuess> {
    try {
      const bet = await this.getPlayerMatcupGuessByBet(playerMatchupBet, user);
      bet.guess = updateGuessDto.guess;
      const savedBet = await this.playerMatchupGuessRepository.save(bet);
      this.logger.verbose(
        `PlayerMatchupGuess for Bet with ID "${playerMatchupBet.id}" successfully updated.`,
      );
      await this.userMissingBetsService.afterGuessWrite(user);
      return savedBet;
    } catch (error) {
      this.logger.error(
        `Failed to update guess for bet with ID: "${playerMatchupBet.id}".`,
        error.stack,
      );
      throw error;
    }
  }
}
