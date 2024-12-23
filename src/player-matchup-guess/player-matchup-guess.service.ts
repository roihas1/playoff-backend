import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PlayerMatchupGuessRepository } from './player-matchup-guess.repository';
import { CreatePlayerMatchupGuessDto } from './dto/create-player-matchup-guess.dto';
import { User } from 'src/auth/user.entity';
import { PlayerMatchupGuess } from './player-matchup-guess.entity';
import { PlayerMatchupBetService } from 'src/player-matchup-bet/player-matchup-bet.service';
import { UpdateGuessDto } from './dto/update-guess.dto';

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
  async updateGuess(
    id: string,
    updateGuessDto: UpdateGuessDto,
  ): Promise<PlayerMatchupGuess> {
    const bet = await this.getPlayerMatcupGuessById(id);
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
}
