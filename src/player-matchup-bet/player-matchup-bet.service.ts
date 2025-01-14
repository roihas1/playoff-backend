import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PlayerMatchupBetRepository } from './player-matchup-bet.repository';
import { CreatePlayerMatchupBetDto } from './dto/create-player-matchup-bet.dto';
import { PlayerMatchupBet } from './player-matchup-bet.entity';
import { UpdateResultDto } from './dto/update-result.dto';
import { UpdateFieldsDto } from './dto/update-fields.dto';
import { User } from 'src/auth/user.entity';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class PlayerMatchupBetService {
  private logger = new Logger('PlayerMatchupBetService', { timestamp: true });
  constructor(
    private playerMatcupBetRepository: PlayerMatchupBetRepository,
    private usersService: AuthService,
  ) {}

  async createPlayerMatchupBet(
    createPlayerMatchupBetDto: CreatePlayerMatchupBetDto,
  ): Promise<PlayerMatchupBet> {
    this.logger.verbose(`Trying to create PlayerMatchupBet.`);
    return await this.playerMatcupBetRepository.createPlayerMatchupBet(
      createPlayerMatchupBetDto,
    );
  }
  async getPlayerMatchupBetById(id: string): Promise<PlayerMatchupBet> {
    const found = await this.playerMatcupBetRepository.findOne({
      where: {
        id,
      },
      relations: ['guesses', 'guesses.createdBy', 'guesses', 'guesses.bet'],
    });
    if (!found) {
      this.logger.error(`PlayerMatchupBet with ID ${id} not found.`);
      throw new NotFoundException(`PlayerMatchupBet with ID ${id} not found.`);
    }
    return found;
  }

  async updateResult(
    updateResultDto: UpdateResultDto,
    id: string,
  ): Promise<PlayerMatchupBet> {
    const bet = await this.getPlayerMatchupBetById(id);
    bet.result = updateResultDto.result;
    try {
      const savedBet = await this.playerMatcupBetRepository.save(bet);
      this.logger.verbose(`Bet with ID "${id}" successfully updated.`);
      await Promise.all(
        savedBet.guesses.map(async (guess) => {
          if (guess.guess === savedBet.result) {
            await this.usersService.updateFantasyPoints(
              guess.createdBy,
              savedBet.fantasyPoints,
            );
          }
        }),
      );
      return savedBet;
    } catch (error) {
      this.logger.error(`Failed to update bet with ID: "${id}".`, error.stack);
      throw error;
    }
  }
  async updateResultForSeries(
    matchup: PlayerMatchupBet,
  ): Promise<PlayerMatchupBet> {
    if (matchup.typeOfMatchup === 'UNDER/OVER') {
      const result = matchup.currentStats[0] < matchup.differential ? 1 : 2;
      matchup.result = result;
    } else {
      const result =
        matchup.currentStats[0] > matchup.currentStats[1] + matchup.differential
          ? 1
          : 2;
      matchup.result = result;
    }
    try {
      const savedBet = await this.playerMatcupBetRepository.save(matchup);
      this.logger.verbose(`Bet with ID "${matchup.id}" successfully updated.`);
      await Promise.all(
        savedBet.guesses.map(async (guess) => {
          if (guess.guess === savedBet.result) {
            await this.usersService.updateFantasyPoints(
              guess.createdBy,
              savedBet.fantasyPoints,
            );
          }
        }),
      );
      return savedBet;
    } catch (error) {
      this.logger.error(
        `Failed to update bet with ID: "${matchup.id}".`,
        error.stack,
      );
      throw error;
    }
  }

  async updateFields(
    updateFieldsDto: UpdateFieldsDto,
    id: string,
  ): Promise<PlayerMatchupBet> {
    const bet = await this.getPlayerMatchupBetById(id);
    Object.assign(bet, updateFieldsDto);

    try {
      const savedBet = await this.playerMatcupBetRepository.save(bet);
      this.logger.verbose(
        `Bet with ID "${id}" successfully updated the fields.`,
      );
      return savedBet;
    } catch (error) {
      this.logger.error(
        `Failed to update bet fields with ID: "${id}".`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteBet(id: string, user: User): Promise<void> {
    try {
      // Check if the bet exists before trying to delete it
      const bet = await this.playerMatcupBetRepository.findOne({
        where: { id },
      });

      if (!bet) {
        // If the bet does not exist, log and throw an error
        this.logger.error(`Bet with ID: "${id}" not found.`);
        throw new Error(`Bet with ID: "${id}" not found.`);
      }

      // Proceed with deletion
      await this.playerMatcupBetRepository.delete(id);

      // Optionally log success
      this.logger.verbose(
        `Successfully deleted bet with ID: "${id}" by user: ${user.username}`,
      );
    } catch (error) {
      // Log the error stack if something goes wrong
      this.logger.error(`Failed to delete bet with ID: "${id}".`, error.stack);
      throw error;
    }
  }
}
