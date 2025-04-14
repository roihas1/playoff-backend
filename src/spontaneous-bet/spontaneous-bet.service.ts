import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SpontaneousBetRepo } from './spontaneous-bet.repository';
import { SpontaneousBet } from './spontaneousBet.entity';
import { CreateSpontaneousBetDto } from './dto/create-spontaneous-bet.dto';
import { UpdateBetFieldsDto } from './dto/update-fields.dto';
import { SpontaneousGuess } from 'src/spontaneous-guess/spontaneous-guess.entity';

@Injectable()
export class SpontaneousBetService {
  private logger = new Logger('SpontaneousBetService', { timestamp: true });
  constructor(private spontaneousBetRepo: SpontaneousBetRepo) {}

  async createSpontaneousBet(
    createSpontaneousBetDto: CreateSpontaneousBetDto,
  ): Promise<SpontaneousBet> {
    try {
      const bet = await this.spontaneousBetRepo.createSpontaneousBet(
        createSpontaneousBetDto,
      );
      this.logger.verbose(`Spontaneous bet created.`);
      return bet;
    } catch (error) {
      this.logger.error(`Failed to create new spontaneous Bet ${error.stack}`);
      throw new InternalServerErrorException(
        `Failed to create new spontaneous Bet`,
      );
    }
  }

  async getBySeriesId(seriesId: string): Promise<SpontaneousBet[]> {
    return this.spontaneousBetRepo
      .createQueryBuilder('bet')
      .where('bet.seriesId = :seriesId', { seriesId })
      .getMany();
  }

  async getActiveBets(): Promise<SpontaneousBet[]> {
    return await this.spontaneousBetRepo
      .createQueryBuilder('bet')
      .select([
        'bet.id AS id',
        'bet.result AS result',
        'bet.player1 AS player1',
        'bet.player2 AS player2',
        'bet.seriesId AS "seriesId"',
        'bet.fantasyPoints AS "fantasyPoints"',
      ])
      .leftJoin('bet.seriesId', 'series') // Join with the series table
      .where('series.dateOfStart > :now', { now: new Date() }) // Check if the series date is in the future
      .getRawMany();
  }
  async getAllBets(): Promise<{ id: string; seriesId: string }[]> {
    const raw = await this.spontaneousBetRepo
      .createQueryBuilder('bet')
      .select(['bet.id AS id', 'bet.seriesId AS "seriesId"'])
      .getRawMany();

    return raw;
  }
  async getAllWithResults(): Promise<
    {
      id: string;
      result: number;
      seriesId: string;
      fantasyPoints: number;
      startTime: Date;
    }[]
  > {
    const raw = await this.spontaneousBetRepo
      .createQueryBuilder('bet')
      .select([
        'bet.id AS id',
        'bet.result AS result',
        'bet.seriesId AS "seriesId"',
        'bet.fantasyPoints AS "fantasyPoints"',
        'bet.startTime AS "startTime"',
      ])
      .getRawMany();

    return raw;
  }

  async getAllSeriesSpontaneousBets(
    seriesId: string,
  ): Promise<SpontaneousBet[]> {
    try {
      const bets =
        await this.spontaneousBetRepo.getAllSeriesSpontaneousBets(seriesId);
      return bets;
    } catch (error) {
      this.logger.error(
        `Failed to get all spontaneous Bets for series:${seriesId},  ${error.stack}`,
      );
      throw new InternalServerErrorException(
        `Failed to get all spontaneous Bets for series:${seriesId}`,
      );
    }
  }
  async getUserGuessForMatchup(
    playerMatchupBet: SpontaneousBet,
    userId: string,
  ): Promise<SpontaneousGuess> {
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
  async getPlayerMatchupBetById(id: string): Promise<SpontaneousBet> {
    const found = await this.spontaneousBetRepo.findOne({
      where: {
        id,
      },
      relations: ['guesses', 'guesses.createdBy', 'guesses', 'guesses.bet'],
    });
    if (!found) {
      this.logger.error(`Spontaneous bet with ID ${id} not found.`);
      throw new NotFoundException(`Spontaneous bet with ID ${id} not found.`);
    }
    return found;
  }
  async updateResultForSeries(
    matchup: SpontaneousBet,
  ): Promise<SpontaneousBet> {
    const previousResult = matchup.result;
    const epsilon = 0.0001;

    const stat1 = matchup.currentStats[0];
    const stat2 = matchup.currentStats[1];
    const diff = matchup.differential;

    const adjustedStat2 = stat2 + diff;

    // Debug logs for tracing
    this.logger.verbose(`Updating SpontaneousBet result for ID: ${matchup.id}`);
    this.logger.verbose(`Stats: [${stat1}, ${stat2}], Differential: ${diff}`);

    if (matchup.typeOfMatchup === 'UNDER/OVER') {
      if (stat1 < diff - epsilon) {
        matchup.result = 1;
      } else if (Math.abs(stat1 - diff) < epsilon) {
        matchup.result = 0;
      } else {
        matchup.result = 2;
      }
    } else {
      if (stat1 > adjustedStat2 + epsilon) {
        matchup.result = 1;
      } else if (Math.abs(stat1 - adjustedStat2) < epsilon) {
        matchup.result = 0;
      } else {
        matchup.result = 2;
      }
    }

    this.logger.verbose(`Calculated result: ${matchup.result}`);

    try {
      const savedBet = await this.spontaneousBetRepo.save(matchup);
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

  async getBetById(betId: string): Promise<SpontaneousBet> {
    try {
      const found = await this.spontaneousBetRepo.findOne({
        where: { id: betId },
        relations: ['guesses', 'guesses.createdBy', 'guesses', 'guesses.bet'],
      });
      if (!found) {
        this.logger.error(`SpontaneousBet with ID ${betId} not found.`);
        throw new NotFoundException(
          `SpontaneousBet with ID ${betId} not found.`,
        );
      }
      return found;
    } catch (error) {
      this.logger.error(`Failed to get spontaneous bet. ${error.stack}`);
      throw new InternalServerErrorException(`Failed to get spontaneous bet.`);
    }
  }
  async updateBetFields(
    updateBetFieldsDto: UpdateBetFieldsDto,
    betId: string,
  ): Promise<SpontaneousBet> {
    try {
      const bet = await this.spontaneousBetRepo.findOne({
        where: { id: betId },
      });
      if (updateBetFieldsDto.currentStats) {
        // update the number of games for each player by the updates for his stats.
        bet.playerGames[0] +=
          updateBetFieldsDto.currentStats[0] === 100
            ? 0
            : updateBetFieldsDto.currentStats[0] >= bet.currentStats[0]
              ? 1
              : -1;
        bet.playerGames[1] +=
          updateBetFieldsDto.currentStats[1] === 100
            ? 0
            : updateBetFieldsDto.currentStats[1] >= bet.currentStats[1]
              ? 1
              : -1;
      }

      Object.assign(bet, updateBetFieldsDto);

      const savedBet = await this.spontaneousBetRepo.save(bet);
      this.logger.verbose(
        `Spontaneoues bet with ID "${betId}" successfully updated the fields.`,
      );
      return savedBet;
    } catch (error) {
      this.logger.error(
        `Failed to update fields to  spontaneous bet. ${error.stack}`,
      );
      throw new InternalServerErrorException(
        `Failed to update fields to  spontaneous bet.`,
      );
    }
  }
  async deleteBet(id: string): Promise<void> {
    try {
      const bet = await this.getBetById(id);
      if (!bet) {
        // If the bet does not exist, log and throw an error
        this.logger.error(`Spontaneous Bet with ID: "${id}" not found.`);
        throw new NotFoundException(
          `Spontaneous Bet with ID: "${id}" not found.`,
        );
      }
      await this.spontaneousBetRepo.delete(id);
      this.logger.verbose(`Successfully deleted bet with ID: "${id}"`);
      return;
    } catch (error) {
      this.logger.error(`Failed to delete spontaneous bet. ${error.stack}`);
      throw new InternalServerErrorException(
        `Failed to delete spontaneous bet.`,
      );
    }
  }
}
