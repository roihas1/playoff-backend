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
import { UpdateResultTeamGamesDto } from './dto/update-team-games-result.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { BestOf7Bet } from 'src/best-of7-bet/bestOf7.entity';
import { PlayerMatchupBet } from 'src/player-matchup-bet/player-matchup-bet.entity';
import { TeamWinBet } from 'src/team-win-bet/team-win-bet.entity';
import { Conference } from './conference.enum';
import { Round } from './round.enum';
import { UpdateSeriesTimeDto } from './dto/update-series-time.dto';
import { SpontaneousGuess } from 'src/spontaneous-guess/spontaneous-guess.entity';
import { SpontaneousBetService } from 'src/spontaneous-bet/spontaneous-bet.service';
import { SpontaneousBet } from 'src/spontaneous-bet/spontaneousBet.entity';

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
    private playerMatcupBetService: PlayerMatchupBetService,
    private spontaneousBetService: SpontaneousBetService,
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
    try {
      const newSeries =
        await this.seriesRepository.createSeries(createSeriesDto);
      await this.bestOf7BetService.createBestOf7Bet({
        seriesId: newSeries.id,
        fantasyPoints: 4,
      });
      await this.teamWinBetService.createTeamWinBet({
        seriesId: newSeries.id,
        fantasyPoints: 6,
      });
      return await this.seriesRepository.findOne({
        where: { id: newSeries.id },
      });
    } catch (error) {
      this.logger.error(`Failed to create new Series `);
      throw new InternalServerErrorException(`Failed to create new Series`);
    }
  }
  async getSeriesByID(id: string): Promise<Series> {
    const foundSeries = await this.seriesRepository.findOne({ where: { id } });
    if (!foundSeries) {
      this.logger.error(`Series with ID "${id}" not found .`);
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }
    return foundSeries;
  }
  async getSeriesScore(id: string): Promise<number[]> {
    try {
      const series = await this.getSeriesByID(id);
      const score = series.bestOf7BetId.seriesScore;
      return score;
    } catch (error) {
      this.logger.error(`Can not return Series score  with ID: ${id} `);
      throw new InternalServerErrorException(
        `Can not return Series score  with ID: ${id}`,
      );
    }
  }

  async deleteSeries(id: string): Promise<void> {
    try {
      const series = await this.getSeriesByID(id);
      await this.bestOf7BetService.deleteBestOf7Bet(series.bestOf7BetId.id);
      await this.teamWinBetService.deleteBet(series.teamWinBetId.id);
      await this.seriesRepository.delete(id);
      this.logger.verbose(`Series with ID: ${id} deleted succesfully.`);
      return;
    } catch (error) {
      this.logger.error(`Series with ID: ${id} did not delete.${error.stack}`);
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
      if (createGuessesDto.teamWinGuess) {
        const createTeamWinGuessDto = {
          guess: createGuessesDto.teamWinGuess,
          teamWinBetId: series.teamWinBetId.id,
        };
        await this.teamWinGuessService.createTeamWinGuess(
          createTeamWinGuessDto,
          user,
        );
      }
      if (createGuessesDto.bestOf7Guess) {
        const createBestOf7GuessDto = {
          guess: createGuessesDto.bestOf7Guess,
          bestOf7BetId: series.bestOf7BetId.id,
        };
        await this.bestOf7GuessService.createBestOf7Guess(
          createBestOf7GuessDto,
          user,
        );
      }

      if (createGuessesDto.playermatchupGuess) {
        series.playerMatchupBets.forEach(async (bet) => {
          if (createGuessesDto.playermatchupGuess.hasOwnProperty(bet.id)) {
            await this.playerMatchupGuessService.createPlayerMatchupGuess(
              {
                guess: createGuessesDto.playermatchupGuess[bet.id],
                playerMatchupBetId: bet.id,
              },
              user,
            );
          }
        });
      }
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
          return await this.playerMatcupBetService.getPlayerMatchupBetById(
            bet.id,
          );
        }),
      );
      const playerMatchupGuesses = playerMatchupBets.map((bet) =>
        bet.guesses?.filter((guess) => {
          return guess.createdById === user.id;
        }),
      );
      console.log(playerMatchupGuesses);
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
  async updateResultTeamGames(
    seriesId: string,
    updateResultTeamGamesDto: UpdateResultTeamGamesDto,
    user: User,
  ): Promise<void> {
    try {
      const series = await this.getSeriesByID(seriesId);
      await this.bestOf7BetService.updateResult(
        { result: updateResultTeamGamesDto.numOfGames },
        series.bestOf7BetId.id,
      );
      await this.teamWinBetService.updateResult(
        { result: updateResultTeamGamesDto.wonTeam },
        series.teamWinBetId.id,
      );
    } catch (error) {
      this.logger.error(
        `User: ${user.username} faild to update results to series: ${seriesId}`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} faild to update resilts to series: ${seriesId}`,
      );
    }
  }
  async updateGame(
    seriesId: string,
    updateGame: UpdateGameDto,
    user: User,
  ): Promise<void> {
    try {
      const series = await this.getSeriesByID(seriesId);
      await this.bestOf7BetService.updateGame(
        series.bestOf7BetId.id,
        updateGame,
        user,
      );
    } catch (error) {
      this.logger.error(
        `User: ${user.username} faild to update results to series: ${seriesId}`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} faild to update results to series: ${seriesId}`,
      );
    }
  }
  async closeAllBetsInSeries(seriesId: string, user: User): Promise<void> {
    try {
      const series = await this.getSeriesByID(seriesId);
      series.lastUpdate = new Date();
      const bestOf7Bet = await this.bestOf7BetService.updateResultForSeries(
        series.bestOf7BetId.id,
      );
      const teamWin =
        bestOf7Bet.seriesScore[0] > bestOf7Bet.seriesScore[1]
          ? 1
          : bestOf7Bet.seriesScore[0] < bestOf7Bet.seriesScore[1]
            ? 2
            : 0;
      await this.teamWinBetService.updateResult(
        { result: teamWin },
        series.teamWinBetId.id,
        bestOf7Bet,
      );
      await Promise.all(
        series.playerMatchupBets.map(async (matchup) => {
          await this.playerMatcupBetService.updateResultForSeries(matchup);
        }),
      );
      await this.seriesRepository.save(series);
    } catch (error) {
      this.logger.error(
        `User: ${user.username} faild to close all bets results to series: ${seriesId}`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} faild to close all bets results to series: ${seriesId}`,
      );
    }
  }
  async checkIfUserGuessedAll(user: User): Promise<{ [key: string]: boolean }> {
    try {
      const series = await this.getAllSeries();
      const result: { [key: string]: boolean } = {};
      series.map((element) => {
        const bestOf7Guess = element.bestOf7BetId.guesses.filter((guess) => {
          return guess.createdById === user.id;
        });

        const teamWinGuess = element.teamWinBetId.guesses.filter(
          (guess) => guess.createdById === user.id,
        );
        const playerMatchupGuess = element.playerMatchupBets.flatMap((bet) => {
          return (
            bet.guesses.filter((guess) => guess.createdById === user.id) || []
          );
        });
        const spontaneousGuesses = element.spontaneousBets.flatMap((bet) => {
          return (
            bet.guesses.filter((guess) => guess.createdById === user.id) || []
          );
        });
        console.log(spontaneousGuesses);
        if (
          bestOf7Guess.length > 0 &&
          teamWinGuess.length > 0 &&
          playerMatchupGuess.length === element.playerMatchupBets.length &&
          spontaneousGuesses.length === element.spontaneousBets.length
        ) {
          result[element.id] = true;
        } else {
          result[element.id] = false;
        }
      });

      return result;
    } catch (error) {
      this.logger.error(
        `User: ${user.username} faild to check if he guessed all the bettings.${error.stack}`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} faild to check if he guessed all the bettings.`,
      );
    }
  }
  async getPointsForUser(seriesId: string, user: User): Promise<number> {
    try {
      const series = await this.getSeriesByID(seriesId); // Assuming this is an optimized DB call
      let userPoints = 0;

      // Use map/filter only once and combine results
      const teamWinGuess = series.teamWinBetId.guesses.find(
        (guess) => guess.createdById === user.id,
      );

      if (teamWinGuess?.guess === series.teamWinBetId.result) {
        const bestOf7Guess = series.bestOf7BetId.guesses.find(
          (guess) =>
            guess.createdById === user.id &&
            series.bestOf7BetId.result === guess.guess,
        );

        userPoints += bestOf7Guess
          ? series.bestOf7BetId.fantasyPoints +
            series.teamWinBetId.fantasyPoints
          : series.teamWinBetId.fantasyPoints;
      }

      // Process playerMatchupBets efficiently by reducing them
      userPoints += series.playerMatchupBets.reduce((acc, matchup) => {
        const guess = matchup.guesses.find(
          (guess) =>
            guess.createdById === user.id && matchup.result === guess.guess,
        );
        return acc + (guess ? matchup.fantasyPoints : 0);
      }, 0);

      return userPoints;
    } catch (error) {
      this.logger.error(
        `User: ${user.username} failed to get points per series id: ${seriesId} "${error}".`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} failed to get points per series id: ${seriesId}.`,
      );
    }
  }
  async getPointsPerSeriesForUser(
    user: User,
  ): Promise<{ [key: string]: number }> {
    try {
      const series = await this.getAllSeries();

      // Use Promise.all to fetch points for all series in parallel
      const result = await Promise.all(
        series.map(async (single) => {
          const points = await this.getPointsForUser(single.id, user);
          return { [single.id]: points };
        }),
      );

      // Convert the result array to an object
      return result.reduce((acc, item) => ({ ...acc, ...item }), {});
    } catch (error) {
      this.logger.error(
        `User: ${user.username} failed to get points for all series "${error}".`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} failed to get points for all series.`,
      );
    }
  }
  async getAllBets(): Promise<{
    [key: string]: {
      team1: string;
      team2: string;
      conference: Conference;
      round: Round;
      startDate: Date;
      bestOf7Bet: BestOf7Bet;
      teamWinBet: TeamWinBet;
      playerMatchupBets: PlayerMatchupBet[];
      spontaneousBets: SpontaneousBet[];
    };
  }> {
    const bettingData: {
      [key: string]: {
        team1: string;
        team2: string;
        conference: Conference;
        round: Round;
        startDate: Date;
        bestOf7Bet: BestOf7Bet;
        teamWinBet: TeamWinBet;
        playerMatchupBets: PlayerMatchupBet[];
        spontaneousBets: SpontaneousBet[];
      };
    } = {};

    try {
      const series = await this.getAllSeries();
      series.forEach((s) => {
        bettingData[s.id] = {
          team1: s.team1,
          team2: s.team2,
          conference: s.conference,
          round: s.round,
          startDate: s.dateOfStart,
          bestOf7Bet: {
            ...s.bestOf7BetId,
          },
          teamWinBet: {
            ...s.teamWinBetId,
          },

          playerMatchupBets: s.playerMatchupBets.map((bet) => ({
            ...bet,
          })),
          spontaneousBets: s.spontaneousBets.map((bet) => ({ ...bet })),
        };
      });

      return bettingData;
    } catch (error) {
      this.logger.error(`Failed to get all bets for all series "${error}".`);
      throw new InternalServerErrorException(
        `Failed to get all bets for all series`,
      );
    }
  }
  async updateSeriesTime(
    seriesId: string,
    updateSeriesTimeDto: UpdateSeriesTimeDto,
  ): Promise<void> {
    try {
      const series = await this.getSeriesByID(seriesId);
      if (updateSeriesTimeDto.dateOfStart) {
        series.dateOfStart = new Date(updateSeriesTimeDto.dateOfStart);
      }
      if (updateSeriesTimeDto.timeOfStart) {
        series.timeOfStart = updateSeriesTimeDto.timeOfStart;
      }
      await this.seriesRepository.save(series);
    } catch (error) {
      this.logger.error(`Failed to update series time. "${error}".`);
      throw new InternalServerErrorException(`Failed to update series time.`);
    }
  }
  private calculatePercentage(guesses, value: number): number {
    const totalGuesses = guesses.length;
    const guessCount = guesses.filter((guess) => guess.guess === value).length;
    const percentage = (guessCount / totalGuesses) * 100;
    return percentage;
  }

  async getGuessesPercentage(seriesId: string): Promise<{
    teamWin: { 1: number; 2: number };
    playerMatchup: { [key: string]: { 1: number; 2: number } };
    spontaneousMacthups: { [key: string]: { 1: number; 2: number } };
  }> {
    try {
      const res: {
        teamWin: { 1: number; 2: number };
        playerMatchup: { [key: string]: { 1: number; 2: number } };
        spontaneousMacthups: { [key: string]: { 1: number; 2: number } };
      } = {
        teamWin: { 1: 0, 2: 0 },
        playerMatchup: {},
        spontaneousMacthups: {},
      };
      const series = await this.getSeriesByID(seriesId);
      const teamWin1Precentage = this.calculatePercentage(
        series.teamWinBetId.guesses,
        1,
      );
      const teamWin2Percentage = this.calculatePercentage(
        series.teamWinBetId.guesses,
        2,
      );
      res['teamWin'] = { 1: teamWin1Precentage, 2: teamWin2Percentage };
      const playerMatchup = {};
      series.playerMatchupBets.map((bet) => {
        const value1 = this.calculatePercentage(bet.guesses, 1);
        const value2 = this.calculatePercentage(bet.guesses, 2);
        playerMatchup[bet.id] = { 1: value1, 2: value2 };
      });
      res['playerMatchup'] = playerMatchup;
      const spontaneous = {};

      series.spontaneousBets.map((bet) => {
        const value1 = this.calculatePercentage(bet.guesses, 1);

        const value2 = this.calculatePercentage(bet.guesses, 2);
        spontaneous[bet.id] = { 1: value1, 2: value2 };
      });

      res['spontaneousMacthups'] = spontaneous;
      return res;
    } catch (error) {
      this.logger.error(`Failed to get guesses percentage. "${error}".`);
      throw new InternalServerErrorException(
        `Failed to get guesses percentage.`,
      );
    }
  }
  async getSpontaneousGuesses(
    seriesId: string,
    user: User,
  ): Promise<SpontaneousGuess[]> {
    try {
      const series = await this.getSeriesByID(seriesId);

      const spontaneousBets = await Promise.all(
        series.spontaneousBets.map(async (bet) => {
          return await this.spontaneousBetService.getBetById(bet.id);
        }),
      );
      const guesses = spontaneousBets.map((bet) =>
        bet.guesses.filter((guess) => guess.createdBy.id === user.id),
      );
      return guesses.flat();
    } catch (error) {
      this.logger.error(`Failed to get spontaneous guesses  "${error}".`);
      throw new InternalServerErrorException(
        `Failed to get spontaneous guesses.`,
      );
    }
  }
}
