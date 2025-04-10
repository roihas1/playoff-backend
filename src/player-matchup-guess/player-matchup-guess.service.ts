import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PlayerMatchupGuessRepository } from './player-matchup-guess.repository';
import { CreatePlayerMatchupGuessDto } from './dto/create-player-matchup-guess.dto';
import { User } from 'src/auth/user.entity';
import { PlayerMatchupGuess } from './player-matchup-guess.entity';
import { PlayerMatchupBetService } from 'src/player-matchup-bet/player-matchup-bet.service';
import { UpdateGuessDto } from './dto/update-guess.dto';
import { PlayerMatchupBet } from 'src/player-matchup-bet/player-matchup-bet.entity';

@Injectable()
export class PlayerMatchupGuessService {
  private logger = new Logger('PlayerMatchupGuessService', { timestamp: true });
  constructor(
    private playerMatchupGuessRepository: PlayerMatchupGuessRepository,
    private playerMatchupBetService: PlayerMatchupBetService,
  ) {}

  async createPlayerMatchupGuess(
    createPlayerMatchGuessDto: CreatePlayerMatchupGuessDto,
    user: User,
  ): Promise<PlayerMatchupGuess> {
    this.logger.verbose(`Trying to create PlayerMatchupGuess.`);
    const { guess, playerMatchupBetId } = createPlayerMatchGuessDto;

    const found = await this.playerMatchupGuessRepository.findOne({
      where: {
        createdBy: user,
        bet: { id: playerMatchupBetId },
      },
    });
    if (found) {
      found.guess = guess;
      return await this.playerMatchupGuessRepository.save(found);
    }
    const playerMatchupBet =
      await this.playerMatchupBetService.getPlayerMatchupBetById(
        playerMatchupBetId,
      );
    return await this.playerMatchupGuessRepository.createPlayerMatchupGuess(
      guess,
      playerMatchupBet,
      user,
    );
  }

  async getGuessesByUser(userId: string): Promise<PlayerMatchupGuess[]> {
    return this.playerMatchupGuessRepository.find({
      where: { createdBy: { id: userId } },
      select: ['id', 'guess', 'betId'],
    });
  }

  async getPlayerMatcupGuessById(id: string): Promise<PlayerMatchupGuess> {
    const found = await this.playerMatchupGuessRepository.findOne({
      where: { id },
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
    bet.guess = updateGuessDto.guess;

    try {
      const savedBet = await this.playerMatchupGuessRepository.save(bet);
      this.logger.verbose(`Bet with ID "${id}" successfully updated.`);
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
