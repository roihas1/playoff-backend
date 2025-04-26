import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
    private playerMatchupBetRepository: PlayerMatchupBetRepository,
    @Inject(forwardRef(() => AuthService))
    private usersService: AuthService,
  ) {}

  async createPlayerMatchupBet(
    createPlayerMatchupBetDto: CreatePlayerMatchupBetDto,
  ): Promise<PlayerMatchupBet> {
    this.logger.verbose(`Trying to create PlayerMatchupBet.`);
    return await this.playerMatchupBetRepository.createPlayerMatchupBet(
      createPlayerMatchupBetDto,
    );
  }
  async getBySeriesId(seriesId: string): Promise<PlayerMatchupBet[]> {
    return this.playerMatchupBetRepository
      .createQueryBuilder('bet')
      .where('bet.seriesId = :seriesId', { seriesId })
      .getMany();
  }

  async getPlayerMatchupBetById(id: string): Promise<PlayerMatchupBet> {
    const found = await this.playerMatchupBetRepository.findOne({
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
  async getPlayerMatchupBetByIdNoGuesses(
    id: string,
  ): Promise<PlayerMatchupBet> {
    const bet = await this.playerMatchupBetRepository
      .createQueryBuilder('playerMatchupBet')
      .where('playerMatchupBet.id = :id', { id })
      .getOne();
    if (!bet) {
      throw new NotFoundException(
        `PlayerMatchupBet with ID "${id}" not found.`,
      );
    }

    return bet;
  }
  async updateResult(
    updateResultDto: UpdateResultDto,
    id: string,
  ): Promise<PlayerMatchupBet> {
    const bet = await this.getPlayerMatchupBetById(id);
    bet.result = updateResultDto.result;
    try {
      const savedBet = await this.playerMatchupBetRepository.save(bet);
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
  async getAllBets(): Promise<{ id: string; seriesId: string }[]> {
    const raw = await this.playerMatchupBetRepository
      .createQueryBuilder('bet')
      .select(['bet.id AS id', 'bet.seriesIdId AS "seriesId"'])
      .getRawMany();

    return raw;
  }

  async getAllWithResults(): Promise<
    { id: string; result: number; seriesId: string; fantasyPoints: number }[]
  > {
    const raw = await this.playerMatchupBetRepository
      .createQueryBuilder('bet')

      .select([
        'bet.id AS id',
        'bet.result AS result',
        'bet.seriesIdId AS "seriesId"',
        'bet.fantasyPoints AS "fantasyPoints"',
      ])
      .getRawMany();

    return raw;
  }
  async getActiveBets(): Promise<any[]> {
    const bets = await this.playerMatchupBetRepository
      .createQueryBuilder('bet')
      .select([
        'bet.id AS id',
        'bet.result AS result',
        'bet.player1 AS player1',
        'bet.player2 AS player2',
        'bet.seriesId AS "seriesId"', // Corrected the reference to seriesId
        'bet.fantasyPoints AS "fantasyPoints"',
      ])
      .leftJoin('bet.seriesId', 'series') // Join with the series table
      .where('series.dateOfStart > :now', { now: new Date() }) // Check if the series date is in the future
      .getRawMany();

    return bets;
  }
  async getPlayerMatchupPercentagesForSeries(
    seriesId: string,
  ): Promise<{ [betId: string]: { 1: number; 2: number } }> {
    const raw = await this.playerMatchupBetRepository
      .createQueryBuilder('bet')
      .innerJoin('bet.guesses', 'guesses')
      .where('bet.seriesId = :seriesId', { seriesId })
      .select('bet.id', 'betId')
      .addSelect('guesses.guess', 'guess') // fix: was 'guess.guess'
      .addSelect('COUNT(*)', 'count')
      .groupBy('bet.id')
      .addGroupBy('guesses.guess')
      .getRawMany();

    const result: { [betId: string]: { 1: number; 2: number } } = {};

    for (const row of raw) {
      const betId = row.betId;
      const guess = Number(row.guess);
      const count = Number(row.count);

      if (!result[betId]) result[betId] = { 1: 0, 2: 0 };
      if (guess === 1 || guess === 2) result[betId][guess] += count;
    }

    // Convert counts to percentages
    for (const betId in result) {
      const total = result[betId][1] + result[betId][2];
      result[betId][1] = total ? (result[betId][1] / total) * 100 : 0;
      result[betId][2] = total ? (result[betId][2] / total) * 100 : 0;
    }

    return result;
  }
  async updateResultForSeries(
    matchup: PlayerMatchupBet,
  ): Promise<PlayerMatchupBet> {
    const previousResult = matchup.result;
    const epsilon = 0.0001;

    const avg1 =
      matchup.playerGames[0] !== 0
        ? matchup.currentStats[0] / matchup.playerGames[0]
        : 0;
    const avg2 =
      matchup.playerGames[1] !== 0
        ? matchup.currentStats[1] / matchup.playerGames[1]
        : 0;

    if (matchup.typeOfMatchup === 'UNDER/OVER') {
      if (avg1 < matchup.differential) {
        matchup.result = 1;
      } else if (Math.abs(avg1 - matchup.differential) < epsilon) {
        matchup.result = 0;
      } else {
        matchup.result = 2;
      }
    } else {
      const adjustedAvg2 = avg2 + matchup.differential;
      if (avg1 > adjustedAvg2 + epsilon) {
        matchup.result = 1;
      } else if (Math.abs(avg1 - adjustedAvg2) < epsilon) {
        matchup.result = 0;
      } else {
        matchup.result = 2;
      }
    }

    try {
      const savedBet = await this.playerMatchupBetRepository.save(matchup);
      this.logger.verbose(`Bet with ID "${matchup.id}" successfully updated.`);
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
    const bet = await this.getPlayerMatchupBetByIdNoGuesses(id);
 
    if (updateFieldsDto.currentStats) {
      const correctedCurrentStats: [number, number] = [
        bet.currentStats[0],
        bet.currentStats[1],
      ];

      for (let i = 0; i < 2; i++) {
        const newStat = updateFieldsDto.currentStats[i];
        const oldStat = bet.currentStats[i];

        if (newStat % 100 === 0) {
          // Player did not play → do not update playerGames or currentStats
          continue;
        }

        bet.playerGames[i] +=
          newStat === oldStat ? 0 : newStat >= oldStat ? 1 : -1;

        correctedCurrentStats[i] = newStat === oldStat ? oldStat : newStat;
      }

      updateFieldsDto.currentStats = correctedCurrentStats;
    }

    Object.assign(bet, updateFieldsDto);

    try {
      const savedBet = await this.playerMatchupBetRepository.save(bet);

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
      const bet = await this.playerMatchupBetRepository.findOne({
        where: { id },
      });

      if (!bet) {
        // If the bet does not exist, log and throw an error
        this.logger.error(`Bet with ID: "${id}" not found.`);
        throw new Error(`Bet with ID: "${id}" not found.`);
      }

      // Proceed with deletion
      await this.playerMatchupBetRepository.delete(id);

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
