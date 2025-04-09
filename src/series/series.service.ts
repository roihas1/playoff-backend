import {
  ConsoleLogger,
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
import { AuthService } from 'src/auth/auth.service';
import { GetAllSeriesGuessesDto } from './dto/get-series-guesses-stats.dto';

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
    private authService: AuthService,
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
      if (
        series.playerMatchupBets.length > 0 ||
        series.spontaneousBets.length > 0
      ) {
        throw new InternalServerErrorException(
          `Please Delete player matchup first!`,
        );
      }
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
        `Series with ID: ${seriesId} did not update the guesses. ${error.stack}`,
      );
      throw new InternalServerErrorException(
        `Series with ID: ${seriesId} did not update the guesses.`,
      );
    }
  }
  async getAllGuessesForUser(
    seriesId: string,
    user: User,
  ): Promise<{
    bestOf7: BestOf7Guess | null;
    teamWon: TeamWinGuess | null;
    playerMatchups: {
      guesses: PlayerMatchupGuess[];
      player1: string;
      player2: string;
    }[];
    spontaneousGuesses: {
      guesses: SpontaneousGuess[];
      player1: string;
      player2: string;
    }[];
  }> {
    try {
      const userWithGuesses = await this.authService.getUserGuesses(user);
      const series = await this.getSeriesByID(seriesId);

      const bestOf7 =
        userWithGuesses.bestOf7Guesses.find(
          (g) => g.betId === series.bestOf7BetId.id,
        ) || null;

      const teamWon =
        userWithGuesses.teamWinGuesses.find(
          (g) => g.betId === series.teamWinBetId.id,
        ) || null;

      const playerMatchups = series.playerMatchupBets.map((bet) => {
        const guesses = userWithGuesses.playerMatchupGuesses.filter(
          (g) => g.betId === bet.id,
        );
        return {
          guesses,
          player1: bet.player1,
          player2: bet.player2,
        };
      });

      const spontaneousGuesses = series.spontaneousBets.map((bet) => {
        const guesses = userWithGuesses.spontaneousGuesses.filter(
          (g) => g.betId === bet.id,
        );
        return {
          guesses,
          player1: bet.player1,
          player2: bet.player2,
        };
      });

      return {
        bestOf7,
        teamWon,
        playerMatchups,
        spontaneousGuesses,
      };
    } catch (error) {
      this.logger.error(
        `User: ${user.username} failed to get all guesses for series: ${seriesId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Could not retrieve guesses for user: ${user.username} in series: ${seriesId}`,
      );
    }
  }
  async getSeriesWithBetsOnly(seriesId: string): Promise<Series> {
    try {
      const series = await this.seriesRepository
        .createQueryBuilder('series')
        .leftJoin('series.bestOf7BetId', 'bestOf7Bet')
        .leftJoin('series.teamWinBetId', 'teamWinBet')
        .leftJoin('series.playerMatchupBets', 'playerMatchupBets')
        .leftJoin('series.spontaneousBets', 'spontaneousBets')
        .addSelect(['bestOf7Bet.id'])
        .addSelect(['teamWinBet.id'])
        .addSelect(['playerMatchupBets.id'])
        .addSelect(['spontaneousBets.id'])
        .where('series.id = :seriesId', { seriesId })
        .getOne();

      if (!series) {
        this.logger.error(`Series with ID "${seriesId}" not found.`);
        throw new NotFoundException(`Series with ID "${seriesId}" not found`);
      }

      return series;
    } catch (error) {
      this.logger.error(
        `Error fetching series "${seriesId}": ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Failed to fetch series "${seriesId}"`,
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
    spontanouesGuess: SpontaneousGuess[];
  }> {
    try {
      console.time();
      const userWithGuesses = await this.authService.getUserGuesses(user);
      const series = await this.getSeriesWithBetsOnly(seriesId);
      // const teamWinBet = await this.teamWinBetService.getTeamWinBetById(
      //   series.teamWinBetId.id,
      // );
      const teamWinGuess = userWithGuesses.teamWinGuesses.filter(
        (g) => g.betId === series.teamWinBetId.id,
      );
      // const teamWinGuess = teamWinBet.guesses?.filter(
      //   (guess) => guess.createdById === user.id,
      // );

      // const bestOf7Bet = await this.bestOf7BetService.getBestOf7betById(
      //   series.bestOf7BetId.id,
      // );
      const bestOf7Guess = userWithGuesses.bestOf7Guesses.filter(
        (g) => g.betId === series.bestOf7BetId.id,
      );
      // const bestOf7Guess = bestOf7Bet.guesses?.filter(
      //   (guess) => guess.createdById === user.id,
      // );
      const playerMatchupBets = await Promise.all(
        series.playerMatchupBets.map(async (bet) => {
          return await this.playerMatcupBetService.getPlayerMatchupBetById(
            bet.id,
          );
        }),
      );

      const playerMatchupGuesses = playerMatchupBets.map((bet) =>
        userWithGuesses.playerMatchupGuesses?.filter((guess) => {
          return guess.betId === bet.id;
        }),
      );

      const flattenedPlayerMatchupGuesses = playerMatchupGuesses.flat();
      const spontaneousGuesses = userWithGuesses.spontaneousGuesses.filter(
        (g) => !!series.spontaneousBets.find((bet) => bet.id === g.betId),
      );
      console.timeEnd();
      return {
        teamWinGuess: teamWinGuess[0],
        bestOf7Guess: bestOf7Guess[0],
        playerMatchupGuess: flattenedPlayerMatchupGuesses
          ? flattenedPlayerMatchupGuesses
          : [],
        spontanouesGuess: spontaneousGuesses,
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
  private calculatePointsForGuess(guess, savedBet, previousResult): number {
    let points = 0;

    const isGuessCorrectNow = guess.guess === savedBet.result;
    const wasGuessCorrectBefore = guess.guess === previousResult;

    // Correct Now, Incorrect Before → Add Points
    if (isGuessCorrectNow && !wasGuessCorrectBefore) {
      points += savedBet.fantasyPoints;
    }

    // Case 2: Incorrect Now, Correct Before → Subtract Points
    else if (!isGuessCorrectNow && wasGuessCorrectBefore) {
      points -= savedBet.fantasyPoints;
    }

    // Case 3 & 4: No Change → No Points Added or Subtracted
    // - Both Correct or Both Incorrect
    else {
      points = 0;
    }

    console.log(
      `Calculated Points for User: ${guess.createdById}, Points: ${points}`,
    );
    return points;
  }
  async closeAllBetsInSeries(seriesId: string, user: User): Promise<void> {
    try {
      let series = await this.getSeriesByID(seriesId);
      series.lastUpdate = new Date();
      const prevTeamWinResult = series.teamWinBetId.result;
      const prevMatchupResult = series.playerMatchupBets.reduce(
        (acc, matchup) => {
          acc[matchup.id] = matchup.result;
          return acc;
        },
        {},
      );

      const bestOf7Bet = await this.bestOf7BetService.updateResultForSeries(
        series.bestOf7BetId.id,
      );
      const teamWin =
        bestOf7Bet.seriesScore[0] > bestOf7Bet.seriesScore[1]
          ? 1
          : bestOf7Bet.seriesScore[0] < bestOf7Bet.seriesScore[1]
            ? 2
            : 0;
      const isSeriesFinished =
        bestOf7Bet.seriesScore[0] === 4 || bestOf7Bet.seriesScore[1] === 4;
      await this.teamWinBetService.updateResult(
        { result: teamWin },
        series.teamWinBetId.id,
        isSeriesFinished,
        bestOf7Bet,
      );

      for (const matchup of series.playerMatchupBets) {
        await this.playerMatcupBetService.updateResultForSeries(matchup);
      }
      for (const matchup of series.spontaneousBets) {
        await this.spontaneousBetService.updateResultForSeries(matchup);
      }

      const users = await this.authService.getAllUsers();
      series = await this.getSeriesByID(seriesId);
      users.map(async (user) => {
        let totalPoints = 0;

        // Calculate points for Team Win Bet
        if (series.teamWinBetId) {
          if (isSeriesFinished) {
            const userGuess = await this.bestOf7BetService.getUserGuess(
              series.bestOf7BetId,
              user.id,
            );
            if (userGuess && userGuess.guess === bestOf7Bet.result) {
              console.log(`added bestof7 points`);
              totalPoints += bestOf7Bet.fantasyPoints;
            }
          }
          const userGuess = await this.teamWinBetService.getUserGuess(
            series.teamWinBetId,
            user.id,
          );
          if (userGuess) {
            totalPoints += this.calculatePointsForGuess(
              userGuess,
              series.teamWinBetId,
              prevTeamWinResult,
            );
            console.log(`added teamwin points ${totalPoints}`);
          }
        }

        // Calculate points for Player Matchup Bets
        for (const matchup of series.playerMatchupBets) {
          const userMatchupGuess =
            await this.playerMatcupBetService.getUserGuessForMatchup(
              matchup,
              user.id,
            );
          if (userMatchupGuess) {
            totalPoints += this.calculatePointsForGuess(
              userMatchupGuess,
              matchup,
              prevMatchupResult[matchup.id],
            );
            console.log(`added matchup points ${totalPoints}`);
          }
        }
        for (const matchup of series.spontaneousBets) {
          const userMatchupGuess =
            await this.spontaneousBetService.getUserGuessForMatchup(
              matchup,
              user.id,
            );
          if (userMatchupGuess) {
            totalPoints += this.calculatePointsForGuess(
              userMatchupGuess,
              matchup,
              prevMatchupResult[matchup.id],
            );
            console.log(`added matchup points ${totalPoints}`);
          }
        }

        // If the user earned any points, update them
        if (totalPoints !== 0) {
          await this.authService.updateFantasyPoints(user, totalPoints);
          this.logger.verbose(
            `User: ${user.username} earned ${totalPoints} points for series: ${seriesId}`,
          );
        }
      });

      // Wait for all updates to complete
      // await Promise.all(updatePromises);

      await this.seriesRepository.update(series.id, { lastUpdate: new Date() });
    } catch (error) {
      this.logger.error(
        `User: ${user.username} faild to close all bets results to series: ${seriesId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} faild to close all bets results to series: ${seriesId}`,
      );
    }
  }
  // async getAllMissingBets(user: User): Promise<{
  //   [key: string]: {
  //     seriesName: string;
  //     gamesAndWinner: boolean;
  //     playerMatchup: PlayerMatchupBet[];
  //     spontaneousBets: SpontaneousBet[];
  //   };
  // }> {
  //   try {
  //     console.time();
  //     const series = await this.getAllSeries();
  //     const result: {
  //       [key: string]: {
  //         seriesName: string;
  //         gamesAndWinner: boolean;
  //         playerMatchup: PlayerMatchupBet[];
  //         spontaneousBets: SpontaneousBet[];
  //       };
  //     } = {};

  //     series.forEach((element) => {
  //       if (!result[element.id]) {
  //         result[element.id] = {
  //           seriesName: `${element.team1} vs ${element.team2}`,
  //           gamesAndWinner: false,
  //           playerMatchup: [],
  //           spontaneousBets: [],
  //         };
  //       }
  //       if (new Date(element.dateOfStart) > new Date()) {
  //         // Check if user has made a Best of 7 guess
  //         const bestOf7Guess = element.bestOf7BetId.guesses.some(
  //           (guess) => guess.createdById === user.id,
  //         );

  //         // Check if user has made a Team Win guess
  //         const teamWinGuess = element.teamWinBetId.guesses.some(
  //           (guess) => guess.createdById === user.id,
  //         );

  //         // If user hasn't made either bet, mark as missing
  //         if (!bestOf7Guess || !teamWinGuess) {
  //           result[element.id].gamesAndWinner = true;
  //         }

  //         // Check missing player matchup bets
  //         element.playerMatchupBets.forEach((bet) => {
  //           const hasUserGuessed = bet.guesses.some(
  //             (guess) => guess.createdById === user.id,
  //           );
  //           if (!hasUserGuessed) {
  //             result[element.id].playerMatchup.push(bet);
  //           }
  //         });
  //       }

  //       // Check missing spontaneous bets
  //       element.spontaneousBets.forEach((bet) => {
  //         if (new Date(bet.startTime) > new Date()) {
  //           const hasUserGuessed = bet.guesses.some(
  //             (guess) => guess.createdById === user.id,
  //           );
  //           if (!hasUserGuessed) {
  //             result[element.id].spontaneousBets.push(bet);
  //           }
  //         }
  //       });
  //     });
  //     Object.keys(result).forEach((key) => {
  //       if (
  //         result[key].gamesAndWinner === false &&
  //         result[key].playerMatchup.length === 0 &&
  //         result[key].spontaneousBets.length === 0
  //       ) {
  //         delete result[key]; // Remove key from the object
  //       }
  //     });
  //     console.timeEnd()
  //     return result;
  //   } catch (error) {
  //     this.logger.error(
  //       `User: ${user.username} faild to get all his missing bets.${error.stack}`,
  //     );
  //     throw new InternalServerErrorException(
  //       `User: ${user.username} faild to get all his missing bets.`,
  //     );
  //   }
  // }
  async getSeriesNamesAndIds(): Promise<{
    [seriesId: string]: { team1: string; team2: string };
  }> {
    const series = await this.seriesRepository
      .createQueryBuilder('series')
      .select(['series.id', 'series.team1', 'series.team2'])
      .getMany();

    const seriesMap: { [seriesId: string]: { team1: string; team2: string } } =
      {};

    series.forEach((s) => {
      seriesMap[s.id] = {
        team1: s.team1,
        team2: s.team2,
      };
    });

    return seriesMap;
  }

  async getOptimizedMissingBets(user: User): Promise<{
    [seriesId: string]: {
      seriesName: string;
      gamesAndWinner: boolean;
      playerMatchup: any[];
      spontaneousBets: any[];
    };
  }> {
    try {
      const userWithGuesses = await this.authService.getUserGuesses(user);
      const series = await this.getSeriesNamesAndIds();
      const bestOf7GuessIds = new Set(
        userWithGuesses.bestOf7Guesses.map((g) => g.betId),
      );
      // const teamWinGuessIds = new Set(
      //   userWithGuesses.teamWinGuesses.map((g) => g.betId),
      // );
      const matchupGuessIds = new Set(
        userWithGuesses.playerMatchupGuesses.map((g) => g.betId),
      );
      const spontaneousGuessIds = new Set(
        userWithGuesses.spontaneousGuesses.map((g) => g.betId),
      );

      const [bestOf7, matchupBets, spontaneous] = await Promise.all([
        this.bestOf7BetService.getActiveBets(),
        // this.teamWinBetService.getActiveBets(),
        this.playerMatcupBetService.getActiveBets(),
        this.spontaneousBetService.getActiveBets(),
      ]);

      const result: {
        [seriesId: string]: {
          seriesName: string;
          gamesAndWinner: boolean;
          playerMatchup: any[];
          spontaneousBets: any[];
        };
      } = {};
      for (const bet of bestOf7) {
        if (!bestOf7GuessIds.has(bet.id)) {
          if (!result[bet.seriesId]) {
            result[bet.seriesId] = {
              seriesName: `${series[bet.seriesId].team1} vs ${series[bet.seriesId].team2}`,
              gamesAndWinner: true,
              playerMatchup: [],
              spontaneousBets: [],
            };
          }
        }
      }

      for (const bet of matchupBets) {
        if (!matchupGuessIds.has(bet.id)) {
          if (!result[bet.seriesId]) {
            result[bet.seriesId] = {
              seriesName: `${series[bet.seriesId].team1} vs ${series[bet.seriesId].team2}`,
              gamesAndWinner: false,
              playerMatchup: [],
              spontaneousBets: [],
            };
          }
          result[bet.seriesId].playerMatchup.push(bet);
        }
      }

      for (const bet of spontaneous) {
        if (!spontaneousGuessIds.has(bet.id)) {
          if (!result[bet.seriesId]) {
            result[bet.seriesId] = {
              seriesName: `${series[bet.seriesId].team1} vs ${series[bet.seriesId].team2}`,
              gamesAndWinner: false,
              playerMatchup: [],
              spontaneousBets: [],
            };
          }
          result[bet.seriesId].spontaneousBets.push(bet);
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to compute missing bets for ${user.username}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to compute missing bets.');
    }
  }
  async checkIfUserGuessedAll(
    user: User,
  ): Promise<{ [seriesId: string]: boolean }> {
    try {
      const { bestOf7GuessIds, matchupGuessIds, spontaneousGuessIds } =
        await this.authService.getUserGuessesForCheck(user.id);

      const [bestOf7, matchupBets, spontaneous] = await Promise.all([
        this.bestOf7BetService.getAllBets(),
        // this.teamWinBetService.getActiveBets(),
        this.playerMatcupBetService.getAllBets(),
        this.spontaneousBetService.getAllBets(),
      ]);

      const betsBySeries: {
        [seriesId: string]: {
          bestOf7?: string;
          // teamWin?: string;
          matchup: string[];
          spontaneous: string[];
        };
      } = {};

      // Organize bets per series
      for (const bet of bestOf7) {
        if (!betsBySeries[bet.seriesId])
          betsBySeries[bet.seriesId] = { matchup: [], spontaneous: [] };
        betsBySeries[bet.seriesId].bestOf7 = bet.id;
      }

      // for (const bet of teamWin) {
      //   if (!betsBySeries[bet.seriesId])
      //     betsBySeries[bet.seriesId] = { matchup: [], spontaneous: [] };
      //   betsBySeries[bet.seriesId].teamWin = bet.id;
      // }

      for (const bet of matchupBets) {
        if (!betsBySeries[bet.seriesId])
          betsBySeries[bet.seriesId] = { matchup: [], spontaneous: [] };
        betsBySeries[bet.seriesId].matchup.push(bet.id);
      }

      for (const bet of spontaneous) {
        if (!betsBySeries[bet.seriesId])
          betsBySeries[bet.seriesId] = { matchup: [], spontaneous: [] };
        betsBySeries[bet.seriesId].spontaneous.push(bet.id);
      }

      // Check if all bets are guessed
      const result: { [seriesId: string]: boolean } = {};

      for (const [seriesId, bets] of Object.entries(betsBySeries)) {
        const guessedAllBestOf7 = bets.bestOf7
          ? bestOf7GuessIds.has(bets.bestOf7)
          : true;

        const guessedAllMatchups = bets.matchup.every((id) =>
          matchupGuessIds.has(id),
        );
        const guessedAllSpontaneous = bets.spontaneous.every((id) =>
          spontaneousGuessIds.has(id),
        );

        result[seriesId] =
          guessedAllBestOf7 && guessedAllMatchups && guessedAllSpontaneous;
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to determine if user ${user.username} completed all bets.`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Could not verify complete guesses for user ${user.username}`,
      );
    }
  }

  // async checkIfUserGuessedAll(user: User): Promise<{ [key: string]: boolean }> {
  //   try {

  //     const series = await this.getAllSeries();
  //     const result: { [key: string]: boolean } = {};
  //     series.map((element) => {
  //       const bestOf7Guess = element.bestOf7BetId.guesses.filter((guess) => {
  //         return guess.createdById === user.id;
  //       });

  //       const teamWinGuess = element.teamWinBetId.guesses.filter(
  //         (guess) => guess.createdById === user.id,
  //       );
  //       const playerMatchupGuess = element.playerMatchupBets.flatMap((bet) => {
  //         return (
  //           bet.guesses.filter((guess) => guess.createdById === user.id) || []
  //         );
  //       });
  //       const spontaneousGuesses = element.spontaneousBets.flatMap((bet) => {
  //         return (
  //           bet.guesses.filter((guess) => guess.createdById === user.id) || []
  //         );
  //       });
  //       if (
  //         bestOf7Guess.length > 0 &&
  //         teamWinGuess.length > 0 &&
  //         playerMatchupGuess.length === element.playerMatchupBets.length &&
  //         spontaneousGuesses.length === element.spontaneousBets.length
  //       ) {
  //         result[element.id] = true;
  //       } else {
  //         result[element.id] = false;
  //       }
  //     });

  //     return result;
  //   } catch (error) {
  //     this.logger.error(
  //       `User: ${user.username} faild to check if he guessed all the bettings.${error.stack}`,
  //     );
  //     throw new InternalServerErrorException(
  //       `User: ${user.username} faild to check if he guessed all the bettings.`,
  //     );
  //   }
  // }
  async getPointsForUser(series: Series, user: User): Promise<number> {
    try {
      // const series = await this.getSeriesByID(seriesId);
      let userPoints = 0;

      // Use map/filter only once and combine results
      // const teamWinGuess = user.teamWinGuesses.find(
      //   (guess) => guess.createdById === user.id,
      // );
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
      if (series.spontaneousBets) {
        userPoints += series.spontaneousBets.reduce((acc, matchup) => {
          const guess = matchup.guesses.find(
            (guess) =>
              guess.createdById === user.id && matchup.result === guess.guess,
          );
          return acc + (guess ? matchup.fantasyPoints : 0);
        }, 0);
      }

      return userPoints;
    } catch (error) {
      this.logger.error(
        `User: ${user.username} failed to get points per series id: ${series.id} "${error}".`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} failed to get points per series id: ${series.id}.`,
      );
    }
  }
  async getPlainSeries(): Promise<Series[]> {
    const baseSeries = await this.seriesRepository.find({
      select: ['id', 'dateOfStart', 'timeOfStart'],
    });

    return baseSeries;
  }
  async calculatePointsForUserSeries(
    user: User,
    seriesMap: {
      [seriesId: string]: {
        teamWin?: { id: string; result: number; fantasyPoints: number };
        bestOf7?: { id: string; result: number; fantasyPoints: number };
        matchupBets?: { id: string; result: number; fantasyPoints: number }[];
        spontaneousBets?: {
          id: string;
          result: number;
          fantasyPoints: number;
        }[];
      };
    },
  ): Promise<{ [seriesId: string]: number }> {
    const userSeriesPoints: { [seriesId: string]: number } = {};

    for (const [seriesId, bets] of Object.entries(seriesMap)) {
      let points = 0;
      // === TeamWin Guess ===
      const teamWinGuess = user.teamWinGuesses.find(
        (g) => g.betId === bets.teamWin?.id,
      );
      const teamWinCorrect =
        teamWinGuess?.guess === bets.teamWin?.result &&
        bets.teamWin?.result !== null;

      if (teamWinCorrect) {
        points += bets.teamWin?.fantasyPoints || 0;
      }

      // === BestOf7 Guess ===
      const bestOf7Guess = user.bestOf7Guesses.find(
        (g) => g.betId === bets.bestOf7?.id,
      );
      const bestOf7Correct =
        bestOf7Guess?.guess === bets.bestOf7?.result &&
        bets.bestOf7?.result !== null;

      if (bestOf7Correct) {
        points += bets.bestOf7?.fantasyPoints || 0;
      }

      // === Player Matchup Guesses ===
      for (const matchup of bets.matchupBets ?? []) {
        const guess = user.playerMatchupGuesses.find(
          (g) => g.betId === matchup.id,
        );
        if (guess?.guess === matchup.result && matchup.result !== null) {
          points += matchup.fantasyPoints || 0;
        }
      }

      // === Spontaneous Guesses ===
      for (const spontaneous of bets.spontaneousBets ?? []) {
        const guess = user.spontaneousGuesses.find(
          (g) => g.betId === spontaneous.id,
        );
        if (
          guess?.guess === spontaneous.result &&
          spontaneous.result !== null
        ) {
          points += spontaneous.fantasyPoints || 0;
        }
      }

      userSeriesPoints[seriesId] = points;
    }

    return userSeriesPoints;
  }
  buildSeriesMap(
    bestOf7: {
      id: string;
      result: number;
      fantasyPoints: number;
      seriesId: string;
    }[],
    teamWin: {
      id: string;
      result: number;
      fantasyPoints: number;
      seriesId: string;
    }[],
    matchupBets: {
      id: string;
      result: number;
      fantasyPoints: number;
      seriesId: string;
    }[],
    spontaneous: {
      id: string;
      result: number;
      fantasyPoints: number;
      seriesId: string;
    }[],
  ): {
    [seriesId: string]: {
      teamWin?: { id: string; result: number; fantasyPoints: number };
      bestOf7?: { id: string; result: number; fantasyPoints: number };
      matchupBets?: { id: string; result: number; fantasyPoints: number }[];
      spontaneousBets?: { id: string; result: number; fantasyPoints: number }[];
    };
  } {
    const seriesMap: {
      [seriesId: string]: {
        teamWin?: { id: string; result: number; fantasyPoints: number };
        bestOf7?: { id: string; result: number; fantasyPoints: number };
        matchupBets?: { id: string; result: number; fantasyPoints: number }[];
        spontaneousBets?: {
          id: string;
          result: number;
          fantasyPoints: number;
        }[];
      };
    } = {};

    const ensureSeries = (seriesId: string) => {
      if (!seriesMap[seriesId]) {
        seriesMap[seriesId] = {};
      }
    };

    for (const bet of bestOf7) {
      ensureSeries(bet.seriesId);
      seriesMap[bet.seriesId].bestOf7 = {
        id: bet.id,
        result: bet.result,
        fantasyPoints: bet.fantasyPoints,
      };
    }

    for (const bet of teamWin) {
      ensureSeries(bet.seriesId);
      seriesMap[bet.seriesId].teamWin = {
        id: bet.id,
        result: bet.result,
        fantasyPoints: bet.fantasyPoints,
      };
    }

    for (const bet of matchupBets) {
      ensureSeries(bet.seriesId);
      if (!seriesMap[bet.seriesId].matchupBets) {
        seriesMap[bet.seriesId].matchupBets = [];
      }
      seriesMap[bet.seriesId].matchupBets.push({
        id: bet.id,
        result: bet.result,
        fantasyPoints: bet.fantasyPoints,
      });
    }

    for (const bet of spontaneous) {
      ensureSeries(bet.seriesId);
      if (!seriesMap[bet.seriesId].spontaneousBets) {
        seriesMap[bet.seriesId].spontaneousBets = [];
      }
      seriesMap[bet.seriesId].spontaneousBets.push({
        id: bet.id,
        result: bet.result,
        fantasyPoints: bet.fantasyPoints,
      });
    }

    return seriesMap;
  }

  async getPointsPerSeriesForUser(
    user: User,
  ): Promise<{ [key: string]: number }> {
    try {
      const userWithGuesses = await this.authService.getUserGuesses(user);

      const bestOf7 = await this.bestOf7BetService.getAllWithResults();

      const teamWin = await this.teamWinBetService.getAllWithResults();
      const matchupBets = await this.playerMatcupBetService.getAllWithResults();
      const spontaneous = await this.spontaneousBetService.getAllWithResults();
      const seriesMap = this.buildSeriesMap(
        bestOf7,
        teamWin,
        matchupBets,
        spontaneous,
      );

      const userPointsPerSeries = await this.calculatePointsForUserSeries(
        userWithGuesses,
        seriesMap,
      );

      return userPointsPerSeries;
    } catch (error) {
      this.logger.error(
        `User: ${user.username} failed to get points for all series "${error} ${error.stack}".`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} failed to get points for all series.`,
      );
    }
  }
  async getAllSeriesNoGuesses(): Promise<Series[]> {
    return await this.seriesRepository
      .createQueryBuilder('series')
      .leftJoinAndSelect('series.bestOf7BetId', 'bestOf7Bet')
      .leftJoinAndSelect('series.teamWinBetId', 'teamWinBet')
      .leftJoinAndSelect('series.playerMatchupBets', 'matchup')
      .leftJoinAndSelect('series.spontaneousBets', 'spontaneous')
      .select([
        'series.id',
        'series.team1',
        'series.team2',
        'series.conference',
        'series.round',
        'series.dateOfStart',

        // BestOf7Bet (no guesses)
        'bestOf7Bet.id',
        'bestOf7Bet.result',
        'bestOf7Bet.fantasyPoints',

        // TeamWinBet (no guesses)
        'teamWinBet.id',
        'teamWinBet.result',
        'teamWinBet.fantasyPoints',

        // PlayerMatchupBets (no guesses)
        'matchup.id',
        'matchup.result',
        'matchup.typeOfMatchup',
        'matchup.categories',
        'matchup.fantasyPoints',
        'matchup.player1',
        'matchup.player2',
        'matchup.differential',
        'matchup.currentStats',
        'matchup.playerGames',

        // SpontaneousBets (no guesses)
        'spontaneous.id',
        'spontaneous.result',
        'spontaneous.typeOfMatchup',
        'spontaneous.categories',
        'spontaneous.fantasyPoints',
        'spontaneous.player1',
        'spontaneous.player2',
        'spontaneous.differential',
        'spontaneous.currentStats',
        'spontaneous.playerGames',
      ])
      .getMany();
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
      const series = await this.getAllSeriesNoGuesses();

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
  async getSpontaneousBetIdsBySeries(seriesId: string): Promise<string[]> {
    try {
      const raw = await this.seriesRepository
        .createQueryBuilder('series')
        .leftJoin('series.spontaneousBets', 'spontaneousBets')
        .where('series.id = :id', { id: seriesId })
        .select(['spontaneousBets.id'])
        .getRawMany();

      return raw.map((row) => row['spontaneousBets_id']);
    } catch (error) {
      this.logger.error(
        `Failed to get spontaneous bet IDs for series ${seriesId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to get spontaneous bet IDs for series ${seriesId}`,
      );
    }
  }

  async getSpontaneousGuesses(
    seriesId: string,
    user: User,
  ): Promise<SpontaneousGuess[]> {
    try {
      const series = await this.getSpontaneousBetIdsBySeries(seriesId);
      const userGuess = await this.authService.getUserSpontanouesGuess(user);
      const spontenouesGuesses = userGuess.filter((g) => {
        return series.includes(g.betId);
      });
      // const spontaneousBets = await Promise.all(
      //   series.spontaneousBets.map(async (bet) => {
      //     return await this.spontaneousBetService.getBetById(bet.id);
      //   }),
      // );
      // const guesses = spontaneousBets.map((bet) =>
      //   bet.guesses.filter((guess) => guess.createdBy.id === user.id),
      // );
      return spontenouesGuesses;
    } catch (error) {
      this.logger.error(`Failed to get spontaneous guesses  "${error}".`);
      throw new InternalServerErrorException(
        `Failed to get spontaneous guesses.`,
      );
    }
  }
  async getAllGuessesAndStats(
    seriesId: string,
    user: User,
  ): Promise<GetAllSeriesGuessesDto> {
    try {
      this.logger.verbose(
        `Fetching all guess data for user: ${user.username} and series: ${seriesId}`,
      );

      const [guesses, percentages] = await Promise.all([
        this.getGuessesByUser(seriesId, user),
        // this.getSpontaneousGuesses(seriesId, user),
        this.getGuessesPercentage(seriesId),
      ]);
      this.logger.verbose(
        `Successfully fetched guess data for user: ${user.username} and series: ${seriesId}`,
      );
      const spontaneousGuesses = guesses.spontanouesGuess;
      return {
        guesses,
        spontaneousGuesses,
        percentages,
      };
    } catch (error) {
      this.logger.error(
        `User: ${user.username} failed to get combined guess data for series: ${seriesId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to get all guess data for series`,
      );
    }
  }
}
