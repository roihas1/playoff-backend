import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BestOf7Guess } from 'src/best-of7-guess/best-of7-guess.entity';
import { ChampionTeamGuess } from 'src/champions-guess/entities/champion-team-guess.entity';
import { ConferenceFinalGuess } from 'src/champions-guess/entities/conference-final-guess.entity';
import { MVPGuess } from 'src/champions-guess/entities/mvp-guess.entity';
import { PlayoffStage } from 'src/playoffs-stage/playoffs-stage.entity';
import { PlayerMatchupGuess } from 'src/player-matchup-guess/player-matchup-guess.entity';
import { PrivateLeague } from 'src/private-league/private-league.entity';
import { SeriesService } from 'src/series/series.service';
import { SpontaneousGuess } from 'src/spontaneous-guess/spontaneous-guess.entity';
import { TeamWinGuess } from 'src/team-win-guess/team-win-guess.entity';
import { Tournament } from 'src/tournament/tournament.entity';
import { DateTime } from 'luxon';
import { Repository } from 'typeorm';
import {
  GetGuessPageStatsDto,
  GuessPageChampionByStageItem,
  GuessPageSeriesItem,
  GuessPageTop5Bucket,
} from './dto/get-guess-page-stats.dto';

type GuessPageQuery = {
  tournamentId: string;
  leagueId?: string;
  stage?: string;
  includeSeries: boolean;
  includeChampion: boolean;
};

@Injectable()
export class StatsService {
  private logger = new Logger('StatsService', { timestamp: true });
  /** Keep start-time gating aligned with existing series percentage gate semantics. */
  private static readonly START_GATE_ZONE = 'Asia/Jerusalem';

  constructor(
    @InjectRepository(Tournament)
    private readonly tournamentRepo: Repository<Tournament>,
    @InjectRepository(PrivateLeague)
    private readonly privateLeagueRepo: Repository<PrivateLeague>,
    @InjectRepository(TeamWinGuess)
    private readonly teamWinGuessRepo: Repository<TeamWinGuess>,
    @InjectRepository(BestOf7Guess)
    private readonly bestOf7GuessRepo: Repository<BestOf7Guess>,
    @InjectRepository(SpontaneousGuess)
    private readonly spontaneousGuessRepo: Repository<SpontaneousGuess>,
    @InjectRepository(PlayoffStage)
    private readonly playoffStageRepo: Repository<PlayoffStage>,
    @InjectRepository(ChampionTeamGuess)
    private readonly championTeamGuessRepo: Repository<ChampionTeamGuess>,
    @InjectRepository(MVPGuess)
    private readonly mvpGuessRepo: Repository<MVPGuess>,
    @InjectRepository(ConferenceFinalGuess)
    private readonly conferenceFinalGuessRepo: Repository<ConferenceFinalGuess>,
    private readonly seriesService: SeriesService,
  ) {}

  private toTwoDecimals(value: number): number {
    return Number(value.toFixed(2));
  }

  private safePercentage(votes: number, total: number): number {
    if (total <= 0) {
      return 0;
    }
    return this.toTwoDecimals((votes / total) * 100);
  }

  private defaultTop5Bucket(): GuessPageTop5Bucket {
    return { top5: [], totalVotes: 0 };
  }

  private parseTimeParts(timeOfStart?: string | null): {
    hour: number;
    minute: number;
    second: number;
  } {
    const normalized = (timeOfStart ?? '00:00:00').trim();
    const parts = normalized.split(':').map((part) => Number(part));
    return {
      hour: parts[0] ?? 0,
      minute: parts[1] ?? 0,
      second: parts[2] ?? 0,
    };
  }

  private getCalendarYmd(dateValue: Date | string): {
    year: number;
    month: number;
    day: number;
  } | null {
    if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim();
      const iso = DateTime.fromISO(trimmed, { zone: 'utc' });
      if (iso.isValid) {
        return { year: iso.year, month: iso.month, day: iso.day };
      }
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
      if (match) {
        return {
          year: Number(match[1]),
          month: Number(match[2]),
          day: Number(match[3]),
        };
      }
      return null;
    }

    if (dateValue instanceof Date) {
      return {
        year: dateValue.getUTCFullYear(),
        month: dateValue.getUTCMonth() + 1,
        day: dateValue.getUTCDate(),
      };
    }

    return null;
  }

  private hasStartPassed(
    startDate: Date | string | null | undefined,
    timeOfStart?: string | null,
  ): boolean {
    if (!startDate) {
      return false;
    }

    const ymd = this.getCalendarYmd(startDate);
    if (!ymd) {
      return false;
    }

    const { hour, minute, second } = this.parseTimeParts(timeOfStart);
    const startIsrael = DateTime.fromObject(
      {
        year: ymd.year,
        month: ymd.month,
        day: ymd.day,
        hour,
        minute,
        second,
      },
      { zone: StatsService.START_GATE_ZONE },
    );
    if (!startIsrael.isValid) {
      return false;
    }

    const nowIsrael = DateTime.now().setZone(StatsService.START_GATE_ZONE);
    return nowIsrael.toMillis() >= startIsrael.toMillis();
  }

  private async validateTournamentOrFail(tournamentId: string): Promise<void> {
    const exists = await this.tournamentRepo.exist({ where: { id: tournamentId } });
    if (!exists) {
      throw new NotFoundException(`Tournament with ID "${tournamentId}" not found.`);
    }
  }

  private async resolveLeagueUserScope(
    tournamentId: string,
    leagueId?: string,
  ): Promise<{ leagueId: string | null; userIds: string[] | null }> {
    if (!leagueId) {
      return { leagueId: null, userIds: null };
    }

    const league = await this.privateLeagueRepo
      .createQueryBuilder('league')
      .leftJoinAndSelect('league.tournament', 'tournament')
      .leftJoinAndSelect('league.users', 'users')
      .where('league.id = :leagueId', { leagueId })
      .getOne();

    if (!league) {
      throw new NotFoundException(`League with ID "${leagueId}" not found.`);
    }

    if (league.tournament?.id !== tournamentId) {
      throw new BadRequestException(
        'leagueId does not belong to the requested tournamentId.',
      );
    }

    const userIds = (league.users ?? []).map((u) => u.id);
    return { leagueId, userIds };
  }

  async getGuessPageStats(query: GuessPageQuery): Promise<GetGuessPageStatsDto> {
    const { tournamentId, stage, includeSeries, includeChampion } = query;

    await this.validateTournamentOrFail(tournamentId);
    const leagueScope = await this.resolveLeagueUserScope(
      tournamentId,
      query.leagueId,
    );

    const response: GetGuessPageStatsDto = {
      meta: {
        tournamentId,
        leagueId: leagueScope.leagueId,
        stageFilter: stage?.trim() ? stage : 'all',
        generatedAt: new Date().toISOString(),
      },
      series: [],
      championByStage: [],
    };

    if (includeSeries) {
      response.series = await this.getSeriesStatsForTournament(
        tournamentId,
        leagueScope.userIds,
      );
    }

    if (includeChampion) {
      response.championByStage = await this.getChampionStatsByStage(
        tournamentId,
        leagueScope.userIds,
        stage,
      );
    }

    return response;
  }

  private async getSeriesStatsForTournament(
    tournamentId: string,
    leagueUserIds: string[] | null,
  ): Promise<GuessPageSeriesItem[]> {
    const allBets = await this.seriesService.getAllBets(tournamentId);
    const startedSeriesIds = Object.keys(allBets).filter((seriesId) =>
      this.hasStartPassed(allBets[seriesId].startDate, allBets[seriesId].timeOfStart),
    );

    if (startedSeriesIds.length === 0) {
      return [];
    }

    const [teamWinRows, bestOf7Rows, playerRows, spontaneousRows] =
      await Promise.all([
        this.getTeamWinCountRows(tournamentId, leagueUserIds),
        this.getBestOf7CountRows(tournamentId, leagueUserIds),
        this.getPlayerMatchupCountRows(tournamentId, leagueUserIds),
        this.getSpontaneousCountRows(tournamentId, leagueUserIds),
      ]);

    const teamWinMap = new Map<string, { 1: number; 2: number }>();
    for (const row of teamWinRows) {
      if (!teamWinMap.has(row.seriesId)) {
        teamWinMap.set(row.seriesId, { 1: 0, 2: 0 });
      }
      if (row.guess === 1 || row.guess === 2) {
        teamWinMap.get(row.seriesId)![row.guess] = row.votes;
      }
    }

    const bestOf7Map = new Map<string, { 4: number; 5: number; 6: number; 7: number }>();
    for (const row of bestOf7Rows) {
      if (!bestOf7Map.has(row.seriesId)) {
        bestOf7Map.set(row.seriesId, { 4: 0, 5: 0, 6: 0, 7: 0 });
      }
      if (row.guess >= 4 && row.guess <= 7) {
        bestOf7Map.get(row.seriesId)![row.guess as 4 | 5 | 6 | 7] = row.votes;
      }
    }

    const playerMap = new Map<string, Map<string, { 1: number; 2: number }>>();
    for (const row of playerRows) {
      if (!playerMap.has(row.seriesId)) {
        playerMap.set(row.seriesId, new Map<string, { 1: number; 2: number }>());
      }
      const seriesBetMap = playerMap.get(row.seriesId)!;
      if (!seriesBetMap.has(row.betId)) {
        seriesBetMap.set(row.betId, { 1: 0, 2: 0 });
      }
      if (row.guess === 1 || row.guess === 2) {
        seriesBetMap.get(row.betId)![row.guess] = row.votes;
      }
    }

    const spontaneousMap = new Map<string, Map<string, { 1: number; 2: number }>>();
    for (const row of spontaneousRows) {
      if (!spontaneousMap.has(row.seriesId)) {
        spontaneousMap.set(row.seriesId, new Map<string, { 1: number; 2: number }>());
      }
      const seriesBetMap = spontaneousMap.get(row.seriesId)!;
      if (!seriesBetMap.has(row.betId)) {
        seriesBetMap.set(row.betId, { 1: 0, 2: 0 });
      }
      if (row.guess === 1 || row.guess === 2) {
        seriesBetMap.get(row.betId)![row.guess] = row.votes;
      }
    }

    return startedSeriesIds.map((seriesId) => {
      const s = allBets[seriesId];
      const teamWinCounts = teamWinMap.get(seriesId) ?? { 1: 0, 2: 0 };
      const teamWinTotal = teamWinCounts[1] + teamWinCounts[2];

      const bestOf7Counts = bestOf7Map.get(seriesId) ?? { 4: 0, 5: 0, 6: 0, 7: 0 };
      const bestOf7Total =
        bestOf7Counts[4] + bestOf7Counts[5] + bestOf7Counts[6] + bestOf7Counts[7];

      const playerCountByBet: Record<string, { 1: number; 2: number; total: number }> =
        {};
      const playerPctByBet: Record<string, { 1: number; 2: number }> = {};
      const playerMeta = (s.playerMatchupBets ?? []).map((bet) => {
        const counts = playerMap.get(seriesId)?.get(bet.id) ?? { 1: 0, 2: 0 };
        const total = counts[1] + counts[2];
        playerCountByBet[bet.id] = { 1: counts[1], 2: counts[2], total };
        playerPctByBet[bet.id] = {
          1: this.safePercentage(counts[1], total),
          2: this.safePercentage(counts[2], total),
        };
        return {
          betId: bet.id,
          player1: bet.player1,
          player2: bet.player2,
          categories: (bet.categories ?? []).map((c) => String(c)),
        };
      });

      const spontaneousCountByBet: Record<
        string,
        { 1: number; 2: number; total: number }
      > = {};
      const spontaneousPctByBet: Record<string, { 1: number; 2: number }> = {};
      const spontaneousMeta = (s.spontaneousBets ?? []).map((bet) => {
        const counts = spontaneousMap.get(seriesId)?.get(bet.id) ?? { 1: 0, 2: 0 };
        const total = counts[1] + counts[2];
        spontaneousCountByBet[bet.id] = { 1: counts[1], 2: counts[2], total };
        spontaneousPctByBet[bet.id] = {
          1: this.safePercentage(counts[1], total),
          2: this.safePercentage(counts[2], total),
        };
        return {
          betId: bet.id,
          gameNumber: bet.gameNumber,
          player1: bet.player1,
          player2: bet.player2,
          categories: (bet.categories ?? []).map((c) => String(c)),
        };
      });

      return {
        seriesId,
        seriesLabel: `${s.team1Name} vs ${s.team2Name} (${s.round})`,
        round: s.round,
        conference: s.conference,
        team1: s.team1Name,
        team2: s.team2Name,
        percentages: {
          teamWin: {
            1: this.safePercentage(teamWinCounts[1], teamWinTotal),
            2: this.safePercentage(teamWinCounts[2], teamWinTotal),
          },
          bestOf7: {
            4: this.safePercentage(bestOf7Counts[4], bestOf7Total),
            5: this.safePercentage(bestOf7Counts[5], bestOf7Total),
            6: this.safePercentage(bestOf7Counts[6], bestOf7Total),
            7: this.safePercentage(bestOf7Counts[7], bestOf7Total),
          },
          playerMatchup: playerPctByBet,
          spontaneousMatchups: spontaneousPctByBet,
        },
        counts: {
          teamWin: { 1: teamWinCounts[1], 2: teamWinCounts[2], total: teamWinTotal },
          bestOf7: {
            4: bestOf7Counts[4],
            5: bestOf7Counts[5],
            6: bestOf7Counts[6],
            7: bestOf7Counts[7],
            total: bestOf7Total,
          },
          playerMatchup: playerCountByBet,
          spontaneousMatchups: spontaneousCountByBet,
        },
        betsMeta: {
          playerMatchup: playerMeta,
          spontaneous: spontaneousMeta,
        },
      };
    });
  }

  private async getChampionStatsByStage(
    tournamentId: string,
    leagueUserIds: string[] | null,
    stageFilter?: string,
  ): Promise<GuessPageChampionByStageItem[]> {
    const rawStages = await this.playoffStageRepo
      .createQueryBuilder('stage')
      .select('stage.name', 'name')
      .addSelect('stage.startDate', 'startDate')
      .addSelect('stage.timeOfStart', 'timeOfStart')
      .where('stage.tournamentId = :tournamentId', { tournamentId })
      .getRawMany<{ name: string; startDate: Date | string; timeOfStart: string }>();

    const startedStageNames = rawStages
      .filter((s) => this.hasStartPassed(s.startDate, s.timeOfStart))
      .map((s) => s.name)
      .filter(Boolean);
    const dedupStageNames = [...new Set(startedStageNames)];
    const requestedStage = stageFilter?.trim();
    const filteredStages =
      requestedStage && requestedStage.toLowerCase() !== 'all'
        ? dedupStageNames.filter((s) => s === requestedStage)
        : dedupStageNames;

    if (filteredStages.length === 0) {
      return [];
    }

    const [champRows, mvpRows, confRows] = await Promise.all([
      this.getChampionTeamRows(tournamentId, leagueUserIds, filteredStages),
      this.getMvpRows(tournamentId, leagueUserIds, filteredStages),
      this.getConferenceFinalRows(tournamentId, leagueUserIds, filteredStages),
    ]);

    const championBuckets = this.toTop5ByStage(champRows, filteredStages);
    const mvpBuckets = this.toTop5ByStage(mvpRows, filteredStages);
    const conferenceBuckets = this.toTop5ByStage(confRows, filteredStages);

    return filteredStages.map((stageName) => ({
      stage: stageName,
      championTeam: championBuckets.get(stageName) ?? this.defaultTop5Bucket(),
      mvp: mvpBuckets.get(stageName) ?? this.defaultTop5Bucket(),
      conferenceFinals: conferenceBuckets.get(stageName) ?? this.defaultTop5Bucket(),
    }));
  }

  private toTop5ByStage(
    rows: { stageName: string; label: string; votes: number }[],
    includedStages: string[],
  ): Map<string, GuessPageTop5Bucket> {
    const byStage = new Map<string, { label: string; votes: number }[]>();

    for (const stageName of includedStages) {
      byStage.set(stageName, []);
    }

    for (const row of rows) {
      if (!byStage.has(row.stageName)) {
        continue;
      }
      byStage.get(row.stageName)!.push({ label: row.label, votes: row.votes });
    }

    const out = new Map<string, GuessPageTop5Bucket>();
    for (const [stageName, entries] of byStage.entries()) {
      const sorted = [...entries].sort((a, b) => b.votes - a.votes);
      const totalVotes = sorted.reduce((sum, e) => sum + e.votes, 0);
      out.set(stageName, {
        top5: sorted.slice(0, 5).map((e) => ({
          label: e.label,
          votes: e.votes,
          percentage: this.safePercentage(e.votes, totalVotes),
        })),
        totalVotes,
      });
    }
    return out;
  }

  private applyLeagueFilter<T>(qb: T, leagueUserIds: string[] | null): T {
    if (!leagueUserIds) {
      return qb;
    }
    if (leagueUserIds.length === 0) {
      // Intentionally impossible predicate when league has no members.
      (qb as any).andWhere('1 = 0');
      return qb;
    }
    (qb as any).andWhere('g.createdById IN (:...leagueUserIds)', { leagueUserIds });
    return qb;
  }

  private async getTeamWinCountRows(
    tournamentId: string,
    leagueUserIds: string[] | null,
  ): Promise<{ seriesId: string; guess: number; votes: number }[]> {
    const qb = this.teamWinGuessRepo
      .createQueryBuilder('g')
      .innerJoin('g.bet', 'bet')
      .innerJoin('bet.seriesId', 'series')
      .select('series.id', 'seriesId')
      .addSelect('g.guess', 'guess')
      .addSelect('COUNT(*)::int', 'votes')
      .where('series.tournamentId = :tournamentId', { tournamentId })
      .andWhere('g.guess IN (:...guesses)', { guesses: [1, 2] })
      .groupBy('series.id')
      .addGroupBy('g.guess');

    this.applyLeagueFilter(qb, leagueUserIds);
    const rows = await qb.getRawMany<{ seriesId: string; guess: string; votes: string }>();
    return rows.map((row) => ({
      seriesId: row.seriesId,
      guess: Number(row.guess),
      votes: Number(row.votes),
    }));
  }

  private async getBestOf7CountRows(
    tournamentId: string,
    leagueUserIds: string[] | null,
  ): Promise<{ seriesId: string; guess: number; votes: number }[]> {
    const qb = this.bestOf7GuessRepo
      .createQueryBuilder('g')
      .innerJoin('g.bet', 'bet')
      .innerJoin('bet.series', 'series')
      .select('series.id', 'seriesId')
      .addSelect('g.guess', 'guess')
      .addSelect('COUNT(*)::int', 'votes')
      .where('series.tournamentId = :tournamentId', { tournamentId })
      .andWhere('g.guess IN (:...guesses)', { guesses: [4, 5, 6, 7] })
      .groupBy('series.id')
      .addGroupBy('g.guess');

    this.applyLeagueFilter(qb, leagueUserIds);
    const rows = await qb.getRawMany<{ seriesId: string; guess: string; votes: string }>();
    return rows.map((row) => ({
      seriesId: row.seriesId,
      guess: Number(row.guess),
      votes: Number(row.votes),
    }));
  }

  private async getPlayerMatchupCountRows(
    tournamentId: string,
    leagueUserIds: string[] | null,
  ): Promise<{ seriesId: string; betId: string; guess: number; votes: number }[]> {
    const qb = this.bestOf7GuessRepo.manager
      .createQueryBuilder(PlayerMatchupGuess, 'g')
      .innerJoin('g.bet', 'bet')
      .innerJoin('bet.seriesId', 'series')
      .select('series.id', 'seriesId')
      .addSelect('bet.id', 'betId')
      .addSelect('g.guess', 'guess')
      .addSelect('COUNT(*)::int', 'votes')
      .where('series.tournamentId = :tournamentId', { tournamentId })
      .andWhere('g.guess IN (:...guesses)', { guesses: [1, 2] })
      .groupBy('series.id')
      .addGroupBy('bet.id')
      .addGroupBy('g.guess');

    this.applyLeagueFilter(qb, leagueUserIds);
    const rows = await qb.getRawMany<{
      seriesId: string;
      betId: string;
      guess: string;
      votes: string;
    }>();
    return rows.map((row) => ({
      seriesId: row.seriesId,
      betId: row.betId,
      guess: Number(row.guess),
      votes: Number(row.votes),
    }));
  }

  private async getSpontaneousCountRows(
    tournamentId: string,
    leagueUserIds: string[] | null,
  ): Promise<{ seriesId: string; betId: string; guess: number; votes: number }[]> {
    const qb = this.spontaneousGuessRepo
      .createQueryBuilder('g')
      .innerJoin('g.bet', 'bet')
      .innerJoin('bet.seriesId', 'series')
      .select('series.id', 'seriesId')
      .addSelect('bet.id', 'betId')
      .addSelect('g.guess', 'guess')
      .addSelect('COUNT(*)::int', 'votes')
      .where('series.tournamentId = :tournamentId', { tournamentId })
      .andWhere('g.guess IN (:...guesses)', { guesses: [1, 2] })
      .groupBy('series.id')
      .addGroupBy('bet.id')
      .addGroupBy('g.guess');

    this.applyLeagueFilter(qb, leagueUserIds);
    const rows = await qb.getRawMany<{
      seriesId: string;
      betId: string;
      guess: string;
      votes: string;
    }>();
    return rows.map((row) => ({
      seriesId: row.seriesId,
      betId: row.betId,
      guess: Number(row.guess),
      votes: Number(row.votes),
    }));
  }

  private async getChampionTeamRows(
    tournamentId: string,
    leagueUserIds: string[] | null,
    stageNames: string[],
  ): Promise<{ stageName: string; label: string; votes: number }[]> {
    const qb = this.championTeamGuessRepo
      .createQueryBuilder('g')
      .innerJoin('g.stage', 'stage')
      .innerJoin('g.teamRelation', 'team')
      .select('stage.name', 'stageName')
      .addSelect('team.name', 'label')
      .addSelect('COUNT(*)::int', 'votes')
      .where('stage.tournamentId = :tournamentId', { tournamentId })
      .andWhere('stage.name IN (:...stageNames)', { stageNames })
      .groupBy('stage.name')
      .addGroupBy('team.name');

    this.applyLeagueFilter(qb, leagueUserIds);
    return qb.getRawMany<{ stageName: string; label: string; votes: number }>();
  }

  private async getMvpRows(
    tournamentId: string,
    leagueUserIds: string[] | null,
    stageNames: string[],
  ): Promise<{ stageName: string; label: string; votes: number }[]> {
    const qb = this.mvpGuessRepo
      .createQueryBuilder('g')
      .innerJoin('g.stage', 'stage')
      .select('stage.name', 'stageName')
      .addSelect('g.player', 'label')
      .addSelect('COUNT(*)::int', 'votes')
      .where('stage.tournamentId = :tournamentId', { tournamentId })
      .andWhere('stage.name IN (:...stageNames)', { stageNames })
      .groupBy('stage.name')
      .addGroupBy('g.player');

    this.applyLeagueFilter(qb, leagueUserIds);
    return qb.getRawMany<{ stageName: string; label: string; votes: number }>();
  }

  private async getConferenceFinalRows(
    tournamentId: string,
    leagueUserIds: string[] | null,
    stageNames: string[],
  ): Promise<{ stageName: string; label: string; votes: number }[]> {
    const qb = this.conferenceFinalGuessRepo
      .createQueryBuilder('g')
      .innerJoin('g.stage', 'stage')
      .innerJoin('g.team1Relation', 'team1')
      .innerJoin('g.team2Relation', 'team2')
      .select('stage.name', 'stageName')
      .addSelect(`CONCAT(g.conference, ': ', team1.name, ' vs ', team2.name)`, 'label')
      .addSelect('COUNT(*)::int', 'votes')
      .where('stage.tournamentId = :tournamentId', { tournamentId })
      .andWhere('stage.name IN (:...stageNames)', { stageNames })
      .groupBy('stage.name')
      .addGroupBy('g.conference')
      .addGroupBy('team1.name')
      .addGroupBy('team2.name');

    this.applyLeagueFilter(qb, leagueUserIds);
    return qb.getRawMany<{ stageName: string; label: string; votes: number }>();
  }
}
