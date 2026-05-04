import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SeriesRepository } from './series.repository';
import { Series } from './series.entity';
// import { User } from '../auth/user.entity';
import { CreateSeriesDto } from './dto/create-series.dto';
import { CreateSeriesData } from './dto/create-series-data';
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
import {
  BestOf7CountsDto,
  BestOf7PercentagesDto,
  GetAllSeriesGuessesDto,
} from './dto/get-series-guesses-stats.dto';
import { SpontaneousGuessService } from 'src/spontaneous-guess/spontaneous-guess.service';
import { UserSeriesPointsService } from 'src/user-series-points/user-series-points.service';
import { DateTime } from 'luxon';
import { MatchupCategory } from 'src/player-matchup-bet/matchup-category.enum';
import { TeamService } from 'src/team/team.service';

export type TournamentInfo = {
  id: string;
  sportType: string;
  year: number;
  name: string;
} | null;

function toTournamentInfo(
  t:
    | { id: string; sportType: string; year: number; name: string }
    | null
    | undefined,
): TournamentInfo {
  return t
    ? { id: t.id, sportType: t.sportType, year: t.year, name: t.name }
    : null;
}

export type SeriesForHomePage = Omit<Series, 'bestOf7BetId' | 'tournament'> & {
  tournament: TournamentInfo;
  spontaneousBets: SpontaneousBet[];
  playerMatchupBets: PlayerMatchupBet[];
  bestOf7BetId: {
    id: string;
    result: number;
    fantasyPoints: number;
    seriesScore: number[];
    seriesId: string;
  } | null;
};

@Injectable()
export class SeriesService {
  private logger = new Logger('SeriesService', { timestamp: true });
  constructor(
    private seriesRepository: SeriesRepository,
    private teamService: TeamService,
    private teamWinGuessService: TeamWinGuessService,
    private bestOf7GuessService: BestOf7GuessService,
    private playerMatchupGuessService: PlayerMatchupGuessService,
    private teamWinBetService: TeamWinBetService,
    private bestOf7BetService: BestOf7BetService,
    private playerMatcupBetService: PlayerMatchupBetService,
    private spontaneousBetService: SpontaneousBetService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    private spontaneousGuessService: SpontaneousGuessService,
    private userSeriesPointsService: UserSeriesPointsService,
  ) {}

  private getDefaultBestOf7Percentages(): BestOf7PercentagesDto {
    return { 4: 0, 5: 0, 6: 0, 7: 0 };
  }

  private getDefaultBestOf7Counts(): BestOf7CountsDto {
    return { 4: 0, 5: 0, 6: 0, 7: 0, total: 0 };
  }

  private toOneDecimal(num: number): number {
    return Number(num.toFixed(1));
  }

  private async getBestOf7Stats(seriesId: string): Promise<{
    bestOf7: BestOf7PercentagesDto;
    bestOf7Counts: BestOf7CountsDto;
  }> {
    if (!seriesId) {
      return {
        bestOf7: this.getDefaultBestOf7Percentages(),
        bestOf7Counts: this.getDefaultBestOf7Counts(),
      };
    }

    const countsByGuess =
      await this.bestOf7GuessService.getSeriesGuessCountsByValue(seriesId);
    const total =
      countsByGuess[4] + countsByGuess[5] + countsByGuess[6] + countsByGuess[7];

    const bestOf7Counts: BestOf7CountsDto = {
      ...this.getDefaultBestOf7Counts(),
      4: countsByGuess[4],
      5: countsByGuess[5],
      6: countsByGuess[6],
      7: countsByGuess[7],
      total,
    };

    if (total === 0) {
      return {
        bestOf7: this.getDefaultBestOf7Percentages(),
        bestOf7Counts,
      };
    }

    const bestOf7: BestOf7PercentagesDto = {
      4: this.toOneDecimal((countsByGuess[4] / total) * 100),
      5: this.toOneDecimal((countsByGuess[5] / total) * 100),
      6: this.toOneDecimal((countsByGuess[6] / total) * 100),
      7: this.toOneDecimal((countsByGuess[7] / total) * 100),
    };

    return { bestOf7, bestOf7Counts };
  }

  async getAllSeries(): Promise<Series[]> {
    return await this.seriesRepository.getAllSeries();
  }

  /** tournamentId per series (null when series has no tournament). */
  async getTournamentIdsForSeriesIds(
    seriesIds: string[],
  ): Promise<Record<string, string | null>> {
    if (seriesIds.length === 0) {
      return {};
    }
    const rows = await this.seriesRepository
      .createQueryBuilder('series')
      .select('series.id', 'id')
      .addSelect('series.tournamentId', 'tournamentId')
      .where('series.id IN (:...ids)', { ids: seriesIds })
      .getRawMany();

    const out: Record<string, string | null> = {};
    for (const r of rows) {
      const id = r.id ?? r.series_id;
      const tid = r.tournamentId ?? r.tournamentid ?? null;
      if (id) {
        out[id] = tid;
      }
    }
    return out;
  }
  parsePostgresArray(str: string): MatchupCategory[] {
    if (!str.startsWith('{') || !str.endsWith('}'))
      return [str] as MatchupCategory[]; // fallback
    return str
      .slice(1, -1) // remove the {}
      .split(',')
      .map((s) => s.trim().replace(/^"|"$/g, '')) as MatchupCategory[]; // remove optional quotes
  }

  async getSeriesForHomePage(
    tournamentId?: string,
  ): Promise<SeriesForHomePage[]> {
    try {
      const baseQuery = this.seriesRepository
        .createQueryBuilder('series')
        .leftJoinAndSelect('series.tournament', 'tournament')
        .leftJoinAndSelect('series.team1Relation', 'team1Relation')
        .leftJoinAndSelect('series.team2Relation', 'team2Relation')
        .select([
          'series.id',
          'series.seed1',
          'series.seed2',
          'series.conference',
          'series.lastUpdate',
          'series.round',
          'series.dateOfStart',
          'series.timeOfStart',
          'tournament.id',
          'tournament.sportType',
          'tournament.year',
          'tournament.name',
          'team1Relation.id',
          'team1Relation.name',
          'team1Relation.abbreviation',
          'team2Relation.id',
          'team2Relation.name',
          'team2Relation.abbreviation',
        ]);

      if (tournamentId) {
        baseQuery.andWhere('series.tournamentId = :tournamentId', {
          tournamentId,
        });
      }

      const seriesList = await baseQuery.getMany();
      const seriesIds = seriesList.map((s) => s.id);

      const [allSpontaneous, allMatchups, allBestOf7] = await Promise.all([
        this.spontaneousBetService.getBySeriesIds(seriesIds),
        this.playerMatcupBetService.getBySeriesIds(seriesIds),
        this.bestOf7BetService.getBySeriesIds(seriesIds),
      ]);
      // console.log([allSpontaneous, allMatchups, allBestOf7]);
      const spontaneousMap = new Map<string, SpontaneousBet[]>();
      allSpontaneous.forEach((bet) => {
        const categoriesArray =
          typeof bet.categories === 'string'
            ? this.parsePostgresArray(bet.categories)
            : Array.isArray(bet.categories)
              ? bet.categories
              : [];

        const mappedBet = {
          ...bet,
          categories: categoriesArray,
        };
        if (!spontaneousMap.has(bet.seriesId))
          spontaneousMap.set(bet.seriesId, []);
        spontaneousMap.get(bet.seriesId)!.push(mappedBet);
      });

      const matchupMap = new Map<string, PlayerMatchupBet[]>();
      allMatchups.forEach((bet) => {
        const categoriesArray =
          typeof bet.categories === 'string'
            ? this.parsePostgresArray(bet.categories)
            : Array.isArray(bet.categories)
              ? bet.categories
              : [];

        const mappedBet = {
          ...bet,
          categories: categoriesArray,
        };

        if (!matchupMap.has(bet.seriesId)) matchupMap.set(bet.seriesId, []);
        matchupMap.get(bet.seriesId)!.push(mappedBet);
      });

      const bestOf7Map = new Map<
        string,
        {
          id: string;
          result: number;
          fantasyPoints: number;
          seriesScore: number[];
          seriesId: string;
        }
      >();
      allBestOf7.forEach((bet) => {
        bestOf7Map.set(bet.seriesId, bet);
      });

      const enrichedSeriesList: SeriesForHomePage[] = seriesList.map(
        (series) => ({
          ...series,
          tournament: toTournamentInfo(series.tournament),
          spontaneousBets: spontaneousMap.get(series.id) ?? [],
          playerMatchupBets: matchupMap.get(series.id) ?? [],
          bestOf7BetId: bestOf7Map.get(series.id) ?? null,
        }),
      );

      return enrichedSeriesList;
    } catch (error) {
      this.logger.error(`Retrieving series for home page failed`, error);
      throw new InternalServerErrorException(
        `Retrieving series for home page failed`,
      );
    }
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
      const [team1, team2] = await Promise.all([
        this.teamService.findByNameOrAbbreviationOrThrow(createSeriesDto.team1),
        this.teamService.findByNameOrAbbreviationOrThrow(createSeriesDto.team2),
      ]);
      if (team1.id === team2.id) {
        throw new BadRequestException(
          'team1Name and team2Name must refer to distinct teams.',
        );
      }
      const payload: CreateSeriesData = {
        team1Id: team1.id,
        team2Id: team2.id,
        seed1: createSeriesDto.seed1,
        seed2: createSeriesDto.seed2,
        round: createSeriesDto.round,
        conference: createSeriesDto.conference,
        dateOfStart: createSeriesDto.dateOfStart,
        timeOfStart: createSeriesDto.timeOfStart,
        ...(createSeriesDto.tournamentId && {
          tournamentId: createSeriesDto.tournamentId,
        }),
      };
      const newSeries = await this.seriesRepository.createSeries(payload);
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
        relations: ['team1Relation', 'team2Relation', 'tournament'],
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to create new Series `);
      throw new InternalServerErrorException(`Failed to create new Series`);
    }
  }

  async updateSeriesFromLastNightWinners(payload: {
    date: string;
    games: { gameId: string; winnerTeamId: string }[];
  }): Promise<{
    updated: number;
    closed: number;
    details: Array<{
      gameId: string;
      winnerTeamId: string;
      outcome: 'no_matching_series' | 'best_of_7_incremented' | 'series_closed';
      seriesId?: string;
      teamThatWonThisGame?: 1 | 2;
      seriesScoreAfter?: [number, number];
    }>;
  }> {
    let updated = 0;
    let closed = 0;
    const details: Array<{
      gameId: string;
      winnerTeamId: string;
      outcome: 'no_matching_series' | 'best_of_7_incremented' | 'series_closed';
      seriesId?: string;
      teamThatWonThisGame?: 1 | 2;
      seriesScoreAfter?: [number, number];
    }> = [];
    for (const game of payload.games) {
      const series = await this.seriesRepository.findInProgressSeriesByTeamId(
        game.winnerTeamId,
      );
      if (!series) {
        this.logger.verbose(
          `No in-progress series found for winnerTeamId ${game.winnerTeamId} (gameId ${game.gameId}), skipping.`,
        );
        details.push({
          gameId: game.gameId,
          winnerTeamId: game.winnerTeamId,
          outcome: 'no_matching_series',
        });
        continue;
      }
      const teamWon = series.team1Relation?.id === game.winnerTeamId ? 1 : 2;
      await this.bestOf7BetService.incrementGameWin(
        series.bestOf7BetId.id,
        teamWon as 1 | 2,
      );
      updated++;
      const bet = await this.bestOf7BetService.getBestOf7BetLight(
        series.bestOf7BetId.id,
      );
      const score = bet.seriesScore ?? [0, 0];
      const seriesScoreAfter: [number, number] = [score[0], score[1]];
      const seriesJustEnded = score[0] === 4 || score[1] === 4;
      details.push({
        gameId: game.gameId,
        winnerTeamId: game.winnerTeamId,
        outcome: seriesJustEnded ? 'series_closed' : 'best_of_7_incremented',
        seriesId: series.id,
        teamThatWonThisGame: teamWon as 1 | 2,
        seriesScoreAfter,
      });
      if (seriesJustEnded) {
        await this.optimizedCloseAllBetsInSeries(series.id);
        closed++;
      }
    }
    return { updated, closed, details };
  }

  async getSeriesNoGuesses(seriesId: string): Promise<Series> {
    try {
      const query = await this.seriesRepository
        .createQueryBuilder('series')
        .leftJoinAndSelect('series.tournament', 'tournament')
        .leftJoinAndSelect('series.team1Relation', 'team1Relation')
        .leftJoinAndSelect('series.team2Relation', 'team2Relation')
        .leftJoinAndSelect('series.playerMatchupBets', 'playerMatchupBet')
        .leftJoinAndSelect('series.bestOf7BetId', 'bestOf7Bet')
        .leftJoinAndSelect('series.spontaneousBets', 'spontaneousBet')
        .where('series.id = :seriesId', { seriesId })
        .getOne();

      if (!query) {
        this.logger.error(`No series found with ID: ${seriesId}`);
        throw new NotFoundException(`No series found with ID: ${seriesId}`);
      }

      return query;
    } catch (error) {
      this.logger.error(
        `Error fetching series without guesses for ID: ${seriesId}`,
        error,
      );
      throw new InternalServerErrorException('Failed to fetch series data');
    }
  }
  async getSeriesByID(id: string): Promise<Series> {
    const foundSeries = await this.seriesRepository.findOne({
      where: { id },
      relations: ['team1Relation', 'team2Relation', 'tournament'],
    });

    if (!foundSeries) {
      this.logger.error(`Series with ID "${id}" not found .`);
      throw new NotFoundException(`Series with ID "${id}" not found`);
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
  async getSeriesWitBestOf7AndTeamBet(seriesId: string): Promise<Series> {
    try {
      const series = await this.seriesRepository
        .createQueryBuilder('series')
        .leftJoin('series.bestOf7BetId', 'bestOf7Bet')
        .leftJoin('series.teamWinBetId', 'teamWinBet')
        .addSelect(['bestOf7Bet.id'])
        .addSelect(['teamWinBet.id'])

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
  async createAllGuesses(
    seriesId: string,
    createGuessesDto: CreateGuessesDto,
    user: User,
  ): Promise<void> {
    try {
      const series = await this.getSeriesWitBestOf7AndTeamBet(seriesId);
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
        const playerMatchupPayload = Object.entries(
          createGuessesDto.playermatchupGuess,
        ).map(([betId, guess]) => ({
          playerMatchupBetId: betId,
          guess: Number(guess),
        }));

        await this.playerMatchupGuessService.createManyPlayerMatchupGuesses(
          playerMatchupPayload,
          user,
        );
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
  async getSeriesMinimalById(seriesId: string): Promise<{
    bestOf7BetId: string;
    teamWinBetId: string;
    playerMatchupBets: { id: string; player1: string; player2: string }[];
    spontaneousBets: { id: string; player1: string; player2: string }[];
  }> {
    try {
      const result = await this.seriesRepository
        .createQueryBuilder('series')
        .leftJoin('series.bestOf7BetId', 'bestOf7Bet')
        .leftJoin('series.teamWinBetId', 'teamWinBet')
        .leftJoin('series.playerMatchupBets', 'playerMatchup')
        .leftJoin('series.spontaneousBets', 'spontaneous')
        .select([
          'series.dateOfStart',
          'series.timeOfStart',
          'series.id',
          'bestOf7Bet.id',
          'teamWinBet.id',
          'playerMatchup.id',
          'playerMatchup.player1',
          'playerMatchup.player2',
          'spontaneous.id',
          'spontaneous.player1',
          'spontaneous.player2',
        ])
        .where('series.id = :id', { id: seriesId })
        .getOne();

      if (!result) {
        throw new NotFoundException(`Series with ID "${seriesId}" not found`);
      }

      const nowJerusalem = DateTime.now().setZone('Asia/Jerusalem');
      const startDateTime = DateTime.fromISO(
        `${result.dateOfStart}T${result.timeOfStart}`,
        {
          zone: 'Asia/Jerusalem',
        },
      );

      if (nowJerusalem < startDateTime) {
        throw new ForbiddenException(
          "You can't access guesses before the series starts.",
        );
      }
      return {
        bestOf7BetId: result.bestOf7BetId?.id,
        teamWinBetId: result.teamWinBetId?.id,
        playerMatchupBets:
          result.playerMatchupBets?.map((pm) => ({
            id: pm.id,
            player1: pm.player1,
            player2: pm.player2,
          })) ?? [],
        spontaneousBets:
          result.spontaneousBets?.map((sp) => ({
            id: sp.id,
            player1: sp.player1,
            player2: sp.player2,
          })) ?? [],
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch minimal series info for ID ${seriesId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch lightweight series data for ID ${seriesId}`,
      );
    }
  }

  async getAllGuessesForUser(
    seriesId: string,
    userId: string,
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
      const userWithGuesses = await this.getUserGuesses(userId);

      const series = await this.getSeriesMinimalById(seriesId);

      const bestOf7 =
        userWithGuesses.bestOf7Guesses.find(
          (g) => g.betId === series.bestOf7BetId,
        ) || null;

      const teamWon =
        userWithGuesses.teamWinGuesses.find(
          (g) => g.betId === series.teamWinBetId,
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
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `User: ${userId} failed to get all guesses for series: ${seriesId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Could not retrieve guesses for user: ${userId} in series: ${seriesId}`,
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
  async getUserGuesses(userId: string): Promise<{
    bestOf7Guesses: BestOf7Guess[];
    teamWinGuesses: TeamWinGuess[];
    playerMatchupGuesses: PlayerMatchupGuess[];
    spontaneousGuesses: SpontaneousGuess[];
  }> {
    try {
      const [
        bestOf7Guesses,
        teamWinGuesses,
        playerMatchupGuesses,
        spontaneousGuesses,
      ] = await Promise.all([
        this.bestOf7GuessService.getGuessesByUser(userId),
        this.teamWinGuessService.getGuessesByUser(userId),
        this.playerMatchupGuessService.getGuessesByUser(userId),
        this.spontaneousGuessService.getGuessesByUser(userId),
      ]);

      return {
        bestOf7Guesses,
        teamWinGuesses,
        playerMatchupGuesses,
        spontaneousGuesses,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get guesses of user: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to get guesses of user: ${userId}`,
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
      const [userWithGuesses, series] = await Promise.all([
        this.getUserGuesses(user.id),
        this.getSeriesWithBetsOnly(seriesId),
      ]);

      const teamWinGuess = userWithGuesses.teamWinGuesses.find(
        (g) => g.betId === series.teamWinBetId.id,
      );

      const bestOf7Guess = userWithGuesses.bestOf7Guesses.find(
        (g) => g.betId === series.bestOf7BetId.id,
      );

      const playerMatchupBetIds = new Set(
        series.playerMatchupBets.map((bet) => bet.id),
      );

      const playerMatchupGuess = userWithGuesses.playerMatchupGuesses.filter(
        (g) => playerMatchupBetIds.has(g.betId),
      );

      const spontaneousBetIds = new Set(
        series.spontaneousBets.map((bet) => bet.id),
      );

      const spontanouesGuess = userWithGuesses.spontaneousGuesses.filter((g) =>
        spontaneousBetIds.has(g.betId),
      );

      return {
        teamWinGuess,
        bestOf7Guess,
        playerMatchupGuess,
        spontanouesGuess,
      };
    } catch (err) {
      this.logger.error(
        `User: ${user.username} failed to get all his guesses to series: ${seriesId}`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} failed to get all his guesses to series: ${seriesId}`,
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
      const series = await this.getSeriesWitBestOf7AndTeamBet(seriesId);
      await this.bestOf7BetService.updateGame(
        series.bestOf7BetId.id,
        updateGame,
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
  async getSeriesBasicData(seriesId: string): Promise<{
    id: string;
    teamWinBetId: string;
    bestOf7BetId: string;
  }> {
    return this.seriesRepository
      .createQueryBuilder('series')
      .leftJoin('series.teamWinBetId', 'teamWinBet')
      .leftJoin('series.bestOf7BetId', 'bestOf7Bet')
      .select([
        'series.id AS id',
        'teamWinBet.id AS "teamWinBetId"',
        'bestOf7Bet.id AS "bestOf7BetId"',
      ])
      .where('series.id = :id', { id: seriesId })
      .getRawOne();
  }
  async optimizedCloseAllBetsInSeries(
    seriesId: string,
    user?: User,
  ): Promise<void> {
    const actor = user?.username ?? 'system';
    try {
      const [series, playerMatchupBets, spontaneousBets] = await Promise.all([
        this.getSeriesBasicData(seriesId),
        this.playerMatcupBetService.getBySeriesId(seriesId),
        this.spontaneousBetService.getBySeriesId(seriesId),
      ]);

      if (!series) throw new NotFoundException('Series not found');

      // const prevTeamWinResult = series.teamWinBetId.result;
      // const prevMatchupResult = playerMatchupBets.reduce(
      //   (acc, matchup) => {
      //     acc[matchup.id] = matchup.result;
      //     return acc;
      //   },
      //   {} as Record<string, number | null>,
      // );

      const bestOf7Bet = await this.bestOf7BetService.updateResultForSeries(
        series.bestOf7BetId,
      );
      const teamWin =
        bestOf7Bet.seriesScore[0] > bestOf7Bet.seriesScore[1]
          ? 1
          : bestOf7Bet.seriesScore[0] < bestOf7Bet.seriesScore[1]
            ? 2
            : 0;
      const isSeriesFinished = bestOf7Bet.seriesScore.includes(4);

      await this.teamWinBetService.updateResult(
        { result: teamWin },
        series.teamWinBetId,
        isSeriesFinished,
        bestOf7Bet,
      );

      await Promise.all([
        ...playerMatchupBets.map((m) =>
          this.playerMatcupBetService.updateResultForSeries(m),
        ),
        ...spontaneousBets.map((m) =>
          this.spontaneousBetService.updateResultForSeries(m),
        ),
      ]);

      await this.seriesRepository.update(series.id, { lastUpdate: new Date() });

      // update points - different approach
      await this.userSeriesPointsService.updateAllUserPointsTotalFSP();

      // await Promise.all(
      //   users.map(async (user) => {
      //     let totalPoints = 0;

      //     if (series.teamWinBetId) {
      //       if (isSeriesFinished) {
      //         const guess = await this.bestOf7BetService.getUserGuess(
      //           series.bestOf7BetId,
      //           user.id,
      //         );
      //         if (guess?.guess === bestOf7Bet.result) {
      //           totalPoints += bestOf7Bet.fantasyPoints;
      //         }
      //       }
      //       const guess = await this.teamWinBetService.getUserGuess(
      //         series.teamWinBetId,
      //         user.id,
      //       );
      //       if (guess) {
      //         totalPoints += this.calculatePointsForGuess(
      //           guess,
      //           series.teamWinBetId,
      //           prevTeamWinResult,
      //         );
      //       }
      //     }

      //     const [userMatchupGuesses, userSpontaneousGuesses] =
      //       await Promise.all([
      //         this.playerMatchupGuessService.getUserGuessesForSeries(
      //           seriesId,
      //           user.id,
      //         ),
      //         this.spontaneousGuessService.getUserGuessesForSeries(
      //           seriesId,
      //           user.id,
      //         ),
      //       ]);

      //     for (const guess of userMatchupGuesses) {
      //       if (guess.bet && guess.bet.id in prevMatchupResult) {
      //         totalPoints += this.calculatePointsForGuess(
      //           guess,
      //           guess.bet,
      //           prevMatchupResult[guess.bet.id],
      //         );
      //       }
      //     }

      //     for (const guess of userSpontaneousGuesses) {
      //       if (guess.bet && guess.bet.id in prevMatchupResult) {
      //         totalPoints += this.calculatePointsForGuess(
      //           guess,
      //           guess.bet,
      //           prevMatchupResult[guess.bet.id],
      //         );
      //       }
      //     }

      //     if (totalPoints !== 0) {
      //       await this.authService.updateFantasyPoints(user, totalPoints);
      //       this.logger.verbose(
      //         `User: ${user.username} earned ${totalPoints} points for series: ${seriesId}`,
      //       );
      //     }
      //   }),
      // );
    } catch (error) {
      this.logger.error(
        `User: ${actor} failed to close all bets for series: ${seriesId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `User: ${actor} failed to close all bets for series: ${seriesId}`,
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

      await this.userSeriesPointsService.updateAllUserPointsTotalFSP();

      await this.seriesRepository.update(series.id, { lastUpdate: new Date() });
    } catch (error) {
      this.logger.error(
        `User: ${user.username} failed to close all bets results to series: ${seriesId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} failed to close all bets results to series: ${seriesId}`,
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
    [seriesId: string]: {
      team1Id: string;
      team2Id: string;
      team1Name: string;
      team2Name: string;
    };
  }> {
    const series = await this.seriesRepository
      .createQueryBuilder('series')
      .leftJoinAndSelect('series.team1Relation', 'team1Relation')
      .leftJoinAndSelect('series.team2Relation', 'team2Relation')
      .select([
        'series.id',
        'team1Relation.id',
        'team1Relation.name',
        'team2Relation.id',
        'team2Relation.name',
      ])
      .getMany();

    const seriesMap: {
      [seriesId: string]: {
        team1Id: string;
        team2Id: string;
        team1Name: string;
        team2Name: string;
      };
    } = {};

    series.forEach((s) => {
      seriesMap[s.id] = {
        team1Id: s.team1Relation?.id ?? '',
        team2Id: s.team2Relation?.id ?? '',
        team1Name: s.team1Relation?.name ?? '',
        team2Name: s.team2Relation?.name ?? '',
      };
    });

    return seriesMap;
  }

  async getSeriesNamesIdsAndTournament(tournamentId?: string): Promise<{
    [seriesId: string]: {
      team1Id: string;
      team2Id: string;
      team1Name: string;
      team2Name: string;
      tournament: TournamentInfo;
    };
  }> {
    const query = this.seriesRepository
      .createQueryBuilder('series')
      .leftJoinAndSelect('series.tournament', 'tournament')
      .leftJoinAndSelect('series.team1Relation', 'team1Relation')
      .leftJoinAndSelect('series.team2Relation', 'team2Relation')
      .select([
        'series.id',
        'team1Relation.id',
        'team1Relation.name',
        'team2Relation.id',
        'team2Relation.name',
        'tournament.id',
        'tournament.sportType',
        'tournament.year',
        'tournament.name',
      ]);

    if (tournamentId) {
      query.andWhere('series.tournamentId = :tournamentId', { tournamentId });
    }

    const series = await query.getMany();

    const seriesMap: {
      [seriesId: string]: {
        team1Id: string;
        team2Id: string;
        team1Name: string;
        team2Name: string;
        tournament: TournamentInfo;
      };
    } = {};

    series.forEach((s) => {
      seriesMap[s.id] = {
        team1Id: s.team1Relation?.id ?? '',
        team2Id: s.team2Relation?.id ?? '',
        team1Name: s.team1Relation?.name ?? '',
        team2Name: s.team2Relation?.name ?? '',
        tournament: toTournamentInfo(s.tournament),
      };
    });

    return seriesMap;
  }

  async getOptimizedMissingBets(
    user: User,
    tournamentId?: string,
  ): Promise<{
    [seriesId: string]: {
      seriesName: string;
      gamesAndWinner: boolean;
      playerMatchup: any[];
      spontaneousBets: any[];
      tournament: TournamentInfo;
    };
  }> {
    try {
      const userWithGuesses = await this.getUserGuesses(user.id);
      const series = await this.getSeriesNamesIdsAndTournament(tournamentId);
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
          tournament: TournamentInfo;
        };
      } = {};
      for (const bet of bestOf7) {
        if (!bestOf7GuessIds.has(bet.id)) {
          if (!result[bet.seriesId]) {
            result[bet.seriesId] = {
              seriesName: `${series[bet.seriesId].team1Name} vs ${series[bet.seriesId].team2Name}`,
              gamesAndWinner: true,
              playerMatchup: [],
              spontaneousBets: [],
              tournament: series[bet.seriesId].tournament,
            };
          }
        }
      }

      for (const bet of matchupBets) {
        if (!matchupGuessIds.has(bet.id)) {
          if (!result[bet.seriesId]) {
            result[bet.seriesId] = {
              seriesName: `${series[bet.seriesId].team1Name} vs ${series[bet.seriesId].team2Name}`,
              gamesAndWinner: false,
              playerMatchup: [],
              spontaneousBets: [],
              tournament: series[bet.seriesId].tournament,
            };
          }
          result[bet.seriesId].playerMatchup.push(bet);
        }
      }

      for (const bet of spontaneous) {
        if (!spontaneousGuessIds.has(bet.id)) {
          if (!result[bet.seriesId]) {
            result[bet.seriesId] = {
              seriesName: `${series[bet.seriesId].team1Name} vs ${series[bet.seriesId].team2Name}`,
              gamesAndWinner: false,
              playerMatchup: [],
              spontaneousBets: [],
              tournament: series[bet.seriesId].tournament,
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
    tournamentId?: string,
    seriesIds?: string[],
  ): Promise<{ [seriesId: string]: boolean }> {
    try {
      const [
        bestOf7Guesses,
        matchupGuesses,
        spontaneousGuesses,
        scopedSeriesIds,
      ] = await Promise.all([
        this.bestOf7GuessService.getGuessesByUser(user.id),
        this.playerMatchupGuessService.getGuessesByUser(user.id),
        this.spontaneousGuessService.getGuessesByUser(user.id),
        this.resolveSeriesIdsForGuessCheck(tournamentId, seriesIds),
      ]);

      if (scopedSeriesIds.length === 0) {
        return {};
      }

      const [bestOf7, matchupBets, spontaneous] = await Promise.all([
        this.bestOf7BetService.getBySeriesIds(scopedSeriesIds),
        this.playerMatcupBetService.getBySeriesIds(scopedSeriesIds),
        this.spontaneousBetService.getBySeriesIds(scopedSeriesIds),
      ]);

      const bestOf7GuessIds = new Set(bestOf7Guesses.map((g) => g.betId));
      const matchupGuessIds = new Set(matchupGuesses.map((g) => g.betId));
      const spontaneousGuessIds = new Set(
        spontaneousGuesses.map((g) => g.betId),
      );

      const betsBySeries: {
        [seriesId: string]: {
          bestOf7?: string;
          // teamWin?: string;
          matchup: string[];
          spontaneous: string[];
        };
      } = {};
      const getSeriesId = (bet: { seriesId?: string; seriesid?: string }) =>
        bet.seriesId ?? bet.seriesid ?? '';

      // Organize bets per series
      for (const bet of bestOf7) {
        const seriesId = getSeriesId(bet);
        if (!seriesId) continue;
        if (!betsBySeries[seriesId])
          betsBySeries[seriesId] = { matchup: [], spontaneous: [] };
        betsBySeries[seriesId].bestOf7 = bet.id;
      }

      // for (const bet of teamWin) {
      //   if (!betsBySeries[bet.seriesId])
      //     betsBySeries[bet.seriesId] = { matchup: [], spontaneous: [] };
      //   betsBySeries[bet.seriesId].teamWin = bet.id;
      // }

      for (const bet of matchupBets) {
        const seriesId = getSeriesId(bet);
        if (!seriesId) continue;
        if (!betsBySeries[seriesId])
          betsBySeries[seriesId] = { matchup: [], spontaneous: [] };
        betsBySeries[seriesId].matchup.push(bet.id);
      }

      for (const bet of spontaneous) {
        const seriesId = getSeriesId(bet);
        if (!seriesId) continue;
        if (!betsBySeries[seriesId])
          betsBySeries[seriesId] = { matchup: [], spontaneous: [] };
        betsBySeries[seriesId].spontaneous.push(bet.id);
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

  private async resolveSeriesIdsForGuessCheck(
    tournamentId?: string,
    seriesIds?: string[],
  ): Promise<string[]> {
    if (seriesIds !== undefined) {
      return [...new Set(seriesIds)];
    }

    const qb = this.seriesRepository
      .createQueryBuilder('series')
      .select('series.id', 'id');

    if (tournamentId) {
      qb.where('series.tournamentId = :tournamentId', { tournamentId });
    }

    const rows = await qb.getRawMany<{ id: string }>();
    return rows.map((row) => row.id).filter(Boolean);
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
    userGuesses: {
      bestOf7Guesses: BestOf7Guess[];
      teamWinGuesses: TeamWinGuess[];
      playerMatchupGuesses: PlayerMatchupGuess[];
      spontaneousGuesses: SpontaneousGuess[];
    },
    seriesMap: {
      [seriesId: string]: {
        teamWin?: { id: string; result: number; fantasyPoints: number };
        bestOf7?: {
          id: string;
          result: number;
          fantasyPoints: number;
          seriesScore: number[];
        };
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
      const teamWinGuess = userGuesses.teamWinGuesses.find(
        (g) => g.betId === bets.teamWin?.id,
      );
      if (
        teamWinGuess?.guess === bets.teamWin?.result &&
        bets.teamWin?.result !== null
      ) {
        points += bets.teamWin?.fantasyPoints || 0;
      }

      // === BestOf7 Guess ===
      const bestOf7Guess = userGuesses.bestOf7Guesses.find(
        (g) => g.betId === bets.bestOf7?.id,
      );
      if (
        bestOf7Guess?.guess === bets.bestOf7?.result &&
        bets.bestOf7.seriesScore.includes(4) &&
        teamWinGuess?.guess === bets.teamWin?.result &&
        bets.bestOf7?.result !== null
      ) {
        points += bets.bestOf7?.fantasyPoints || 0;
      }

      // === Player Matchup Guesses ===
      for (const matchup of bets.matchupBets ?? []) {
        const guess = userGuesses.playerMatchupGuesses.find(
          (g) => g.betId === matchup.id,
        );
        if (guess?.guess === matchup.result && matchup.result !== null) {
          points += matchup.fantasyPoints || 0;
        }
      }

      // === Spontaneous Guesses ===
      for (const spontaneous of bets.spontaneousBets ?? []) {
        const guess = userGuesses.spontaneousGuesses.find(
          (g) => g.betId === spontaneous.id,
        );

        if (!guess || spontaneous.result === null) continue;

        if (guess.guess === spontaneous.result) {
          points += 2;
        } else {
          points -= 1;
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
      seriesScore: number[];
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
      startTime: Date;
    }[],
    validSeriesIds: Set<string>,
  ): {
    [seriesId: string]: {
      teamWin?: { id: string; result: number; fantasyPoints: number };
      bestOf7?: {
        id: string;
        result: number;
        fantasyPoints: number;
        seriesScore: number[];
      };
      matchupBets?: { id: string; result: number; fantasyPoints: number }[];
      spontaneousBets?: { id: string; result: number; fantasyPoints: number }[];
    };
  } {
    const seriesMap: {
      [seriesId: string]: {
        teamWin?: { id: string; result: number; fantasyPoints: number };
        bestOf7?: {
          id: string;
          result: number;
          fantasyPoints: number;
          seriesScore: number[];
        };
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
      if (!validSeriesIds.has(bet.seriesId)) continue;
      ensureSeries(bet.seriesId);
      seriesMap[bet.seriesId].bestOf7 = {
        id: bet.id,
        result: bet.result,
        fantasyPoints: bet.fantasyPoints,
        seriesScore: bet.seriesScore,
      };
    }

    for (const bet of teamWin) {
      if (!validSeriesIds.has(bet.seriesId)) continue;
      ensureSeries(bet.seriesId);
      seriesMap[bet.seriesId].teamWin = {
        id: bet.id,
        result: bet.result,
        fantasyPoints: bet.fantasyPoints,
      };
    }

    for (const bet of matchupBets) {
      if (!validSeriesIds.has(bet.seriesId)) continue;
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
    const now = new Date();
    for (const bet of spontaneous) {
      if (new Date(bet.startTime) > now) continue;
      if (!validSeriesIds.has(bet.seriesId)) continue;
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
  async getStartedSeriesIds(): Promise<Set<string>> {
    const series = await this.seriesRepository
      .createQueryBuilder('series')
      .select(['series.id', 'series.dateOfStart', 'series.timeOfStart'])
      .getMany();
    const now = new Date();
    const startedSeries = series.filter((s) => {
      const startTime = new Date(`${s.dateOfStart}T${s.timeOfStart}`);
      return startTime <= now;
    });
    const startedSeriesIds = new Set(startedSeries.map((s) => s.id));
    return startedSeriesIds;
  }
  async getPointsPerSeriesForUser(
    userId: string,
    tournamentId?: string,
  ): Promise<{ [key: string]: number }> {
    try {
      const userWithGuesses = await this.getUserGuesses(userId);
      let startedSeriesIds = await this.getStartedSeriesIds();
      if (tournamentId) {
        const seriesForTournament =
          await this.getSeriesNamesIdsAndTournament(tournamentId);
        const tournamentSeriesIds = new Set(Object.keys(seriesForTournament));
        startedSeriesIds = new Set(
          [...startedSeriesIds].filter((id) => tournamentSeriesIds.has(id)),
        );
      }
      const bestOf7 = await this.bestOf7BetService.getAllWithResults();

      const teamWin = await this.teamWinBetService.getAllWithResults();
      const matchupBets = await this.playerMatcupBetService.getAllWithResults();
      const spontaneous = await this.spontaneousBetService.getAllWithResults();
      const seriesMap = this.buildSeriesMap(
        bestOf7,
        teamWin,
        matchupBets,
        spontaneous,
        startedSeriesIds,
      );

      const userPointsPerSeries = await this.calculatePointsForUserSeries(
        userWithGuesses,
        seriesMap,
      );

      return userPointsPerSeries;
    } catch (error) {
      this.logger.error(
        `User: ${userId} failed to get points for all series "${error} ${error.stack}".`,
      );
      throw new InternalServerErrorException(
        `User: ${userId} failed to get points for all series.`,
      );
    }
  }
  /**
   * Series + teams + tournament + best-of-7 + team-win only (no matchup/spontaneous collections).
   * Matchup and spontaneous bets are loaded separately to avoid a Cartesian product in SQL.
   */
  async getAllSeriesNoGuesses(tournamentId?: string): Promise<Series[]> {
    const query = this.seriesRepository
      .createQueryBuilder('series')
      .leftJoinAndSelect('series.tournament', 'tournament')
      .leftJoinAndSelect('series.team1Relation', 'team1Relation')
      .leftJoinAndSelect('series.team2Relation', 'team2Relation')
      .leftJoinAndSelect('series.bestOf7BetId', 'bestOf7Bet')
      .leftJoinAndSelect('series.teamWinBetId', 'teamWinBet')
      .select([
        'series.id',
        'series.conference',
        'series.round',
        'series.dateOfStart',
        'series.timeOfStart',
        'team1Relation.id',
        'team1Relation.name',
        'team1Relation.abbreviation',
        'team2Relation.id',
        'team2Relation.name',
        'team2Relation.abbreviation',
        'tournament.id',
        'tournament.sportType',
        'tournament.year',
        'tournament.name',

        // BestOf7Bet (no guesses)
        'bestOf7Bet.id',
        'bestOf7Bet.result',
        'bestOf7Bet.fantasyPoints',
        'bestOf7Bet.seriesScore',

        // TeamWinBet (no guesses)
        'teamWinBet.id',
        'teamWinBet.result',
        'teamWinBet.fantasyPoints',
      ]);

    if (tournamentId) {
      query.andWhere('series.tournamentId = :tournamentId', { tournamentId });
    }

    return query.getMany();
  }

  async getAllBets(tournamentId?: string): Promise<{
    [key: string]: {
      team1Id: string;
      team2Id: string;
      team1Name: string;
      team2Name: string;
      team1Abbreviation: string;
      team2Abbreviation: string;
      conference: Conference;
      round: Round;
      startDate: Date;
      timeOfStart: string;
      tournament: TournamentInfo;
      bestOf7Bet: BestOf7Bet;
      teamWinBet: TeamWinBet;
      playerMatchupBets: PlayerMatchupBet[];
      spontaneousBets: SpontaneousBet[];
    };
  }> {
    const bettingData: {
      [key: string]: {
        team1Id: string;
        team2Id: string;
        team1Name: string;
        team2Name: string;
        team1Abbreviation: string;
        team2Abbreviation: string;
        conference: Conference;
        round: Round;
        startDate: Date;
        timeOfStart: string;
        tournament: TournamentInfo;
        bestOf7Bet: BestOf7Bet;
        teamWinBet: TeamWinBet;
        playerMatchupBets: PlayerMatchupBet[];
        spontaneousBets: SpontaneousBet[];
      };
    } = {};

    try {
      const series = await this.getAllSeriesNoGuesses(tournamentId);
      if (series.length === 0) {
        return {};
      }

      const seriesIds = series.map((s) => s.id);
      const [allMatchups, allSpontaneous] = await Promise.all([
        this.playerMatcupBetService.getBySeriesIds(seriesIds),
        this.spontaneousBetService.getBySeriesIds(seriesIds),
      ]);

      const matchupMap = new Map<string, PlayerMatchupBet[]>();
      for (const bet of allMatchups) {
        const categoriesArray =
          typeof bet.categories === 'string'
            ? this.parsePostgresArray(bet.categories)
            : Array.isArray(bet.categories)
              ? bet.categories
              : [];
        const seriesId =
          (bet as PlayerMatchupBet & { seriesid?: string }).seriesId ??
          (bet as PlayerMatchupBet & { seriesid?: string }).seriesid;
        if (!seriesId) continue;
        const mappedBet = {
          ...bet,
          categories: categoriesArray,
        };
        if (!matchupMap.has(seriesId)) matchupMap.set(seriesId, []);
        matchupMap.get(seriesId)!.push(mappedBet);
      }

      const spontaneousMap = new Map<string, SpontaneousBet[]>();
      for (const bet of allSpontaneous) {
        const categoriesArray =
          typeof bet.categories === 'string'
            ? this.parsePostgresArray(bet.categories)
            : Array.isArray(bet.categories)
              ? bet.categories
              : [];
        const seriesId =
          (bet as SpontaneousBet & { seriesid?: string }).seriesId ??
          (bet as SpontaneousBet & { seriesid?: string }).seriesid;
        if (!seriesId) continue;
        const mappedBet = {
          ...bet,
          categories: categoriesArray,
        };
        if (!spontaneousMap.has(seriesId)) spontaneousMap.set(seriesId, []);
        spontaneousMap.get(seriesId)!.push(mappedBet);
      }

      series.forEach((s) => {
        bettingData[s.id] = {
          team1Id: s.team1Relation?.id ?? '',
          team2Id: s.team2Relation?.id ?? '',
          team1Name: s.team1Relation?.name ?? '',
          team2Name: s.team2Relation?.name ?? '',
          team1Abbreviation: s.team1Relation?.abbreviation ?? '',
          team2Abbreviation: s.team2Relation?.abbreviation ?? '',
          conference: s.conference,
          round: s.round,
          startDate: s.dateOfStart,
          timeOfStart: s.timeOfStart,
          tournament: toTournamentInfo(s.tournament),
          bestOf7Bet: {
            ...s.bestOf7BetId,
          },
          teamWinBet: {
            ...s.teamWinBetId,
          },

          playerMatchupBets: (matchupMap.get(s.id) ?? []).map((bet) => ({
            ...bet,
          })),
          spontaneousBets: (spontaneousMap.get(s.id) ?? []).map((bet) => ({
            ...bet,
          })),
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

  /** Used only for the guesses-percentage gate: schedule is interpreted as Asia/Jerusalem wall time. */
  private static readonly PERCENTAGE_SCHEDULE_ZONE = 'Asia/Jerusalem';

  private parseTimeOfDayParts(t: string): {
    hour: number;
    minute: number;
    second: number;
  } {
    const parts = t
      .trim()
      .split(':')
      .map((p) => parseInt(p, 10));
    return {
      hour: parts[0] ?? 0,
      minute: parts[1] ?? 0,
      second: parts[2] ?? 0,
    };
  }

  /**
   * Calendar parts for `date` column — may arrive as `Date` or ISO/string from TypeORM/driver.
   */
  private getCalendarYmdFromDateColumn(
    /** Runtime may be `Date` or ISO string depending on driver/query. */
    dateOfStart: unknown,
  ): { year: number; month: number; day: number } | null {
    if (dateOfStart == null) return null;

    if (typeof dateOfStart === 'string') {
      const trimmed = dateOfStart.trim();
      const iso = DateTime.fromISO(trimmed, { zone: 'utc' });
      if (iso.isValid) {
        return { year: iso.year, month: iso.month, day: iso.day };
      }
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
      if (m) {
        return {
          year: Number(m[1]),
          month: Number(m[2]),
          day: Number(m[3]),
        };
      }
      return null;
    }

    if (dateOfStart instanceof Date) {
      return {
        year: dateOfStart.getUTCFullYear(),
        month: dateOfStart.getUTCMonth() + 1,
        day: dateOfStart.getUTCDate(),
      };
    }

    return null;
  }

  /** Interprets `dateOfStart` + `timeOfStart` as local time in Israel (same convention as admin UI). */
  private getSeriesStartInIsrael(series: Series): DateTime | null {
    const ymd = this.getCalendarYmdFromDateColumn(series.dateOfStart);
    if (!ymd) return null;

    const { year: y, month: m, day } = ymd;

    const timeStr = series.timeOfStart?.trim() || '00:00:00';
    const normalized =
      timeStr.split(':').length === 2 ? `${timeStr}:00` : timeStr;
    const { hour, minute, second } = this.parseTimeOfDayParts(normalized);

    const dt = DateTime.fromObject(
      { year: y, month: m, day, hour, minute, second },
      { zone: SeriesService.PERCENTAGE_SCHEDULE_ZONE },
    );

    return dt.isValid ? dt : null;
  }

  async getSeriesIfStartedByID(seriesId: string): Promise<Series | null> {
    const series = await this.seriesRepository
      .createQueryBuilder('series')
      .leftJoinAndSelect('series.teamWinBetId', 'teamWinBet')
      .where('series.id = :seriesId', { seriesId })
      .getOne();

    if (!series) return null;

    const startIsrael = this.getSeriesStartInIsrael(series);
    if (!startIsrael) {
      this.logger.warn(
        `Invalid schedule for percentage gate (seriesId=${seriesId}).`,
      );
      return null;
    }

    if (Date.now() < startIsrael.toMillis()) return null;
    return series;
  }

  async getGuessesPercentage(
    seriesId: string,
    bestOf7Stats?: {
      bestOf7: BestOf7PercentagesDto;
      bestOf7Counts: BestOf7CountsDto;
    },
  ): Promise<{
    teamWin: { 1: number; 2: number };
    playerMatchup: { [key: string]: { 1: number; 2: number } };
    spontaneousMacthups: { [key: string]: { 1: number; 2: number } };
    bestOf7: BestOf7PercentagesDto;
  }> {
    try {
      const res: {
        teamWin: { 1: number; 2: number };
        playerMatchup: { [key: string]: { 1: number; 2: number } };
        spontaneousMacthups: { [key: string]: { 1: number; 2: number } };
        bestOf7: BestOf7PercentagesDto;
      } = {
        teamWin: { 1: 0, 2: 0 },
        playerMatchup: {},
        spontaneousMacthups: {},
        bestOf7: this.getDefaultBestOf7Percentages(),
      };
      const series = await this.getSeriesIfStartedByID(seriesId);
      if (!series) {
        return {
          teamWin: { 1: 0, 2: 0 },
          playerMatchup: {},
          spontaneousMacthups: {},
          bestOf7: this.getDefaultBestOf7Percentages(),
        };
      }
      // const teamWin1Precentage = this.calculatePercentage(
      //   series.teamWinBetId.guesses,
      //   1,
      // );
      // const teamWin2Percentage = this.calculatePercentage(
      //   series.teamWinBetId.guesses,
      //   2,
      // );
      res['teamWin'] = await this.teamWinGuessService.getTeamWinPercentages(
        series.teamWinBetId.id,
      );
      // const playerMatchup = {};
      // series.playerMatchupBets.map((bet) => {
      //   const value1 = this.calculatePercentage(bet.guesses, 1);
      //   const value2 = this.calculatePercentage(bet.guesses, 2);
      //   playerMatchup[bet.id] = { 1: value1, 2: value2 };
      // });
      res['playerMatchup'] =
        await this.playerMatcupBetService.getPlayerMatchupPercentagesForSeries(
          series.id,
        );

      // series.spontaneousBets.map((bet) => {
      //   const value1 = this.calculatePercentage(bet.guesses, 1);

      //   const value2 = this.calculatePercentage(bet.guesses, 2);
      //   spontaneous[bet.id] = { 1: value1, 2: value2 };
      // });
      res['spontaneousMacthups'] =
        await this.spontaneousBetService.getSpontaneousBetsPercentagesForSeries(
          series.id,
        );
      const { bestOf7 } =
        bestOf7Stats ?? (await this.getBestOf7Stats(series.id));
      res['bestOf7'] = bestOf7;
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

      const series = await this.getSeriesIfStartedByID(seriesId);
      const bestOf7Stats = series
        ? await this.getBestOf7Stats(series.id)
        : {
            bestOf7: this.getDefaultBestOf7Percentages(),
            bestOf7Counts: this.getDefaultBestOf7Counts(),
          };
      const [guesses, percentages] = await Promise.all([
        this.getGuessesByUser(seriesId, user),
        // this.getSpontaneousGuesses(seriesId, user),
        this.getGuessesPercentage(seriesId, bestOf7Stats),
      ]);
      const { bestOf7Counts } = bestOf7Stats;
      this.logger.verbose(
        `Successfully fetched guess data for user: ${user.username} and series: ${seriesId}`,
      );
      const spontaneousGuesses = guesses.spontanouesGuess;
      return {
        guesses,
        spontaneousGuesses,
        percentages,
        bestOf7Counts,
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
