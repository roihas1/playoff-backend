import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SeriesRepository } from './series.repository';
import { Series } from './series.entity';
// import { User } from '../auth/user.entity';
import { CreateSeriesDto } from './dto/create-series.dto';
import { GetSeriesWithFilterDto } from './dto/get-series-filter.dto';
import { CreateGuessesDto } from './dto/create-guesses.dto';
import { User } from 'src/auth/user.entity';
import { TeamWinGuessService } from 'src/team-win-guess/team-win-guess.service';
import { BestOf7GuessService } from 'src/best-of7-guess/best-of7-guess.service';
import { PlayerMatchupGuessService } from 'src/player-matchup-guess/player-matchup-guess.service';
import { BestOf7Guess } from 'src/best-of7-guess/best-of7-guess.entity';
import { PlayerMatchupGuess } from 'src/player-matchup-guess/player-matchup-guess.entity';
import { TeamWinGuess } from 'src/team-win-guess/team-win-guess.entity';
import { TeamWinBetService } from 'src/team-win-bet/team-win-bet.service';
import { BestOf7BetService } from 'src/best-of7-bet/best-of7-bet.service';
import { PlayerMatchupBetService } from 'src/player-matchup-bet/player-matchup-bet.service';
import { UpdateGuessesDto } from './dto/update-guesses.dto';

@Injectable()
export class SeriesService {
  private logger = new Logger('SeriesService', { timestamp: true });
  constructor(
    private seriesRepository: SeriesRepository,
    private teamWinGuessService: TeamWinGuessService,
    private bestOf7GuessService: BestOf7GuessService,
    private playerMatchupGuessService: PlayerMatchupGuessService,
    private teamWinBetService: TeamWinBetService,
    private bestOf7BetService: BestOf7BetService,
    private playerMatcupbetService: PlayerMatchupBetService,
  ) {}

  async getAllSeries(): Promise<Series[]> {
    return await this.seriesRepository.getAllSeries();
  }
  async getSeriesWithFilters(
    filters: GetSeriesWithFilterDto,
  ): Promise<Series[]> {
    try {
      const series = await this.seriesRepository.getSeriesWithFilters(filters);
      this.logger.verbose(`Retrieving series succeed.`);
      return series;
    } catch (error) {
      this.logger.error(
        `Retrieving series had problems with filters: ${JSON.stringify(filters)}`,
      );
      throw new InternalServerErrorException(
        `Retrieving series had problems with filters: ${JSON.stringify(filters)}`,
      );
    }
  }
  async createSeries(createSeriesDto: CreateSeriesDto): Promise<Series> {
    return await this.seriesRepository.createSeries(createSeriesDto);
  }
  async getSeriesByID(id: string): Promise<Series> {
    const foundSeries = await this.seriesRepository.findOne({ where: { id } });
    if (!foundSeries) {
      this.logger.error(`Series with ID "${id}" not found .`);
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }
    return foundSeries;
  }

  async deleteSeries(id: string): Promise<void> {
    try {
      await this.seriesRepository.delete(id);
      this.logger.verbose(`Series with ID: ${id} deleted succesfully.`);
      return;
    } catch (error) {
      this.logger.error(`Series with ID: ${id} did not delete.`);
      throw new InternalServerErrorException(
        `Series with ID: ${id} was not deleted.`,
      );
    }
  }
  async createAllGuesses(
    seriesId: string,
    createGuessesDto: CreateGuessesDto,
    user: User,
  ): Promise<void> {
    try {
      const series = await this.getSeriesByID(seriesId);

      const createTeamWinGuessDto = {
        guess: createGuessesDto.teamWinGuess,
        teamWinBetId: series.teamWinBetId.id,
      };
      await this.teamWinGuessService.createTeamWinGuess(
        createTeamWinGuessDto,
        user,
      );

      const createBestOf7GuessDto = {
        guess: createGuessesDto.bestOf7Guess,
        bestOf7BetId: series.bestOf7BetId.id,
      };
      await this.bestOf7GuessService.createBestOf7Guess(
        createBestOf7GuessDto,
        user,
      );

      series.playerMatchupBets.forEach(async (bet, idx) => {
        await this.playerMatchupGuessService.createPlayerMatchupGuess(
          {
            guess: createGuessesDto.playermatchupGuess[idx],
            playerMatchupBetId: bet.id,
          },
          user,
        );
      });
    } catch (error) {
      this.logger.error(
        `Series with ID: ${seriesId} did not update the guesses.`,
      );
      throw new InternalServerErrorException(
        `Series with ID: ${seriesId} did not update the guesses.`,
      );
    }
  }

  async getGuessesByUser(
    seriesId: string,
    user: User,
  ): Promise<{
    teamWinGuess: TeamWinGuess;
    bestOf7Guess: BestOf7Guess;
    playerMatchupGuess: PlayerMatchupGuess[];
  }> {
    try {
      const series = await this.getSeriesByID(seriesId);
      const teamWinBet = await this.teamWinBetService.getTeamWinBetById(
        series.teamWinBetId.id,
      );

      const teamWinGuess = teamWinBet.guesses?.filter(
        (guess) => guess.createdById === user.id,
      );

      const bestOf7Bet = await this.bestOf7BetService.getBestOf7betById(
        series.bestOf7BetId.id,
      );

      const bestOf7Guess = bestOf7Bet.guesses?.filter(
        (guess) => guess.createdById === user.id,
      );
      const playerMatchupBets = await Promise.all(
        series.playerMatchupBets.map(async (bet) => {
          return await this.playerMatcupbetService.getPlayerMatchupBetById(
            bet.id,
          );
        }),
      );
      const playerMatchupGuesses = playerMatchupBets.map((bet) =>
        bet.guesses?.filter((guess) => guess.createdById === user.id),
      );

      const flattenedPlayerMatchupGuesses = playerMatchupGuesses.flat();
      return {
        teamWinGuess: teamWinGuess[0],
        bestOf7Guess: bestOf7Guess[0],
        playerMatchupGuess: flattenedPlayerMatchupGuesses
          ? flattenedPlayerMatchupGuesses
          : [],
      };
    } catch (err) {
      this.logger.error(
        `User: ${user.username} faild to get all his guesses to series: ${seriesId}`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} faild to get all his guesses to series: ${seriesId}`,
        err.stack,
      );
    }
  }

  async updateGuesses(
    seriesId: string,
    updateGuessesDto: UpdateGuessesDto,
    user: User,
  ): Promise<void> {
    try {
      const series = await this.getSeriesByID(seriesId);

      if (updateGuessesDto.teamWinGuess) {
        const updateTeamWinDto = {
          guess: updateGuessesDto.teamWinGuess,
        };
        await this.teamWinGuessService.updateGuess(
          series.teamWinBetId,
          updateTeamWinDto,
          user,
        );
      }
      if (updateGuessesDto.bestOf7Guess) {
        await this.bestOf7GuessService.updateGuessByBet(
          series.bestOf7BetId,
          updateGuessesDto.bestOf7Guess,
          user,
        );
      }
      if (updateGuessesDto.playermatchupGuess) {
        series.playerMatchupBets.forEach(async (bet, idx) => {
          await this.playerMatchupGuessService.updateGuessByBet(
            bet,
            {
              guess: updateGuessesDto.playermatchupGuess[idx],
            },
            user,
          );
        });
      }
    } catch (error) {
      this.logger.error(
        `User: ${user.username} faild to update  his guesses to series: ${seriesId}`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} faild to update  his guesses to series: ${seriesId}`,
      );
    }
  }
}
