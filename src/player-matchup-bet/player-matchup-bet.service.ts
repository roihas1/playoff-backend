import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PlayerMatchupBetRepository } from './player-matchup-bet.repository';
import { CreatePlayerMatchupBetDto } from './dto/create-player-matchup-bet.dto';
import { PlayerMatchupBet } from './player-matchup-bet.entity';
import { UpdateResultDto } from './dto/update-result.dto';
import { UpdateFieldsDto } from './dto/update-fields.dto';
import { User } from 'src/auth/user.entity';
import { AuthService } from 'src/auth/auth.service';
import { PlayerMatchupGuess } from 'src/player-matchup-guess/player-matchup-guess.entity';

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
  private calculatePointsForGuess(
    guess: PlayerMatchupGuess,
    savedBet: PlayerMatchupBet,
    previousResult: number,
  ): number {
    let points = 0;
    const isGuessCorrectNow = guess.guess === savedBet.result;
    const wasGuessCorrectBefore = guess.guess === previousResult;

    if (isGuessCorrectNow && !wasGuessCorrectBefore) {
      points += savedBet.fantasyPoints;
    } else if (!isGuessCorrectNow && wasGuessCorrectBefore) {
      points -= savedBet.fantasyPoints;
    } else {
      points = 0;
    }
    console.log(
      `PLayer matchup bet Calculated Points for User: ${guess.createdById}, Points: ${points}`,
    );
    return points;
  }
  async updateResultForSeries(
    matchup: PlayerMatchupBet,
  ): Promise<PlayerMatchupBet> {
    const previousResult = matchup.result;
    if (matchup.typeOfMatchup === 'UNDER/OVER') {
      const result =
        matchup.currentStats[0] > matchup.currentStats[1] + matchup.differential
          ? 1
          : matchup.currentStats[0] ===
              matchup.currentStats[1] + matchup.differential
            ? 0
            : 2;
      matchup.result = result;
    } else {
      const result =
        matchup.currentStats[0] > matchup.currentStats[1] + matchup.differential
          ? 1
          : matchup.currentStats[0] ===
              matchup.currentStats[1] + matchup.differential
            ? 0
            : 2;
      matchup.result = result;
    }
    try {
      const savedBet = await this.playerMatcupBetRepository.save(matchup);
      this.logger.verbose(`Bet with ID "${matchup.id}" successfully updated.`);

      // for (const guess of savedBet.guesses) {
      //   const points = this.calculatePointsForGuess(
      //     guess,
      //     savedBet,
      //     previousResult,
      //   );
      //   if (points !== 0) {
      //     await this.usersService.updateFantasyPoints(guess.createdBy, points);
      //   }
      // }

      return savedBet;
    } catch (error) {
      this.logger.error(
        `Failed to update bet with ID: "${matchup.id}".`,
        error.stack,
      );
      throw error;
    }
  }

  async getUserGuessForMatchup(
    playerMatchupBet: PlayerMatchupBet,
    userId: string,
  ): Promise<PlayerMatchupGuess> {
    try {
      const guess = playerMatchupBet.guesses.filter(
        (g) => g.createdById === userId,
      );
      return guess[0];
    } catch (error) {
      this.logger.error(
        `Failed to get user guess for bet with ID: "${playerMatchupBet.id}" and user:${userId}.`,
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
    if (updateFieldsDto.currentStats) {
      console.log(updateFieldsDto.currentStats);
      // update the number of games for each player by the updates for his stats.
      bet.playerGames[0] +=
        updateFieldsDto.currentStats[0] === 100
          ? 0
          : updateFieldsDto.currentStats[0] >= bet.currentStats[0]
            ? 1
            : -1;
      bet.playerGames[1] +=
        updateFieldsDto.currentStats[1] === 100
          ? 0
          : updateFieldsDto.currentStats[1] >= bet.currentStats[1]
            ? 1
            : -1;
    }
    Object.assign(bet, updateFieldsDto);

    try {
      const savedBet = await this.playerMatcupBetRepository.save(bet);
      this.logger.verbose(
        `PlayerMatchupBet with ID "${id}" successfully updated the fields.`,
      );
      return savedBet;
    } catch (error) {
      this.logger.error(
        `Failed to update PlayerMatchupBet fields with ID: "${id}".`,
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
