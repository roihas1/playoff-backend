import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DateTime } from 'luxon';
import { DataSource } from 'typeorm';
import { SeriesService } from '../series/series.service';
import { LastNightWinnersResponse } from './dto/last-night-winners-response.dto';
import { SlateGradingClient } from 'src/Integrations/slate-grading/slate-grading.client';
import { SlatePlayerResultRow } from 'src/Integrations/slate-grading/dto/slate-grade.dto';
import { PlayerMatchupBetService } from 'src/player-matchup-bet/player-matchup-bet.service';
import { SpontaneousBetService } from 'src/spontaneous-bet/spontaneous-bet.service';
import { UserSeriesPointsService } from 'src/user-series-points/user-series-points.service';
import { PlayerMatchupBet } from 'src/player-matchup-bet/player-matchup-bet.entity';
import { SpontaneousBet } from 'src/spontaneous-bet/spontaneousBet.entity';
import { BetStatUpdate } from 'src/bet-stat-update/bet-stat-update.entity';
import { MatchupCategory } from 'src/player-matchup-bet/matchup-category.enum';
import { PlayerMatchupType } from 'src/player-matchup-bet/player-matchup-type.enum';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private readonly pythonUrl =
    process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8000';
  private readonly lastNightWinnersPath =
    '/api/team/team-stat/last-night-winners';
  private readonly slateLogDetailLimit = 25;

  constructor(
    private readonly httpService: HttpService,
    private readonly seriesService: SeriesService,
    private readonly slateGradingClient: SlateGradingClient,
    private readonly playerMatchupBetService: PlayerMatchupBetService,
    private readonly spontaneousBetService: SpontaneousBetService,
    private readonly userSeriesPointsService: UserSeriesPointsService,
    private readonly dataSource: DataSource,
  ) {}

  private recomputeResultForBet(bet: PlayerMatchupBet | SpontaneousBet): void {
    const epsilon = 0.0001;
    const avg1 =
      (bet.playerGames?.[0] ?? 0) !== 0
        ? (bet.currentStats?.[0] ?? 0) / (bet.playerGames?.[0] ?? 0)
        : 0;
    const avg2 =
      (bet.playerGames?.[1] ?? 0) !== 0
        ? (bet.currentStats?.[1] ?? 0) / (bet.playerGames?.[1] ?? 0)
        : 0;

    if (bet.typeOfMatchup === 'UNDER/OVER') {
      if (avg1 < bet.differential) {
        bet.result = 1;
      } else if (Math.abs(avg1 - bet.differential) < epsilon) {
        bet.result = 0;
      } else {
        bet.result = 2;
      }
      return;
    }

    const adjustedAvg2 = avg2 + bet.differential;
    if (avg1 > adjustedAvg2 + epsilon) {
      bet.result = 1;
    } else if (Math.abs(avg1 - adjustedAvg2) < epsilon) {
      bet.result = 0;
    } else {
      bet.result = 2;
    }
  }

  private resolveRequestCategories(
    categories: Array<MatchupCategory | string> | null | undefined,
  ): string[] {
    const source = (categories ?? []).map(String);
    const toApiCategory = (category: string): string | null => {
      const byCategory: Record<string, string> = {
        [MatchupCategory.POINTS]: 'points',
        [MatchupCategory.REBOUNDS]: 'rebounds',
        [MatchupCategory.ASSISTS]: 'assists',
        [MatchupCategory.THREE_POINT_SHOTS_MADE]: 'threesMade',
        [MatchupCategory.STEALS]: 'steals',
        [MatchupCategory.BLOCKS]: 'blocks',
        [MatchupCategory.TURNOVERS]: 'turnovers',
        [MatchupCategory.FIELD_GOAL_PERCENTAGE]: 'fieldGoalPercentage',
        [MatchupCategory.FREE_THROW_PERCENTAGE]: 'freeThrowPercentage',
        [MatchupCategory.MINUTES_PLAYED]: 'minutesPlayed',
      };
      return byCategory[category] ?? null;
    };
    const hasDoubleDouble = source.includes(MatchupCategory.DOUBLE_DOUBLE);
    const hasTripleDouble = source.includes(MatchupCategory.TRIPLE_DOUBLE);
    if (hasDoubleDouble || hasTripleDouble) {
      return ['points', 'rebounds', 'assists', 'steals', 'blocks'];
    }
    const normalized = source
      .map((category) => toApiCategory(category))
      .filter((category): category is string => Boolean(category));
    return normalized;
  }

  private getCategoryResultKey(category: string): string | null {
    const byCategory: Record<string, string> = {
      [MatchupCategory.POINTS]: 'points',
      [MatchupCategory.REBOUNDS]: 'rebounds',
      [MatchupCategory.ASSISTS]: 'assists',
      [MatchupCategory.THREE_POINT_SHOTS_MADE]: 'threesMade',
      [MatchupCategory.STEALS]: 'steals',
      [MatchupCategory.BLOCKS]: 'blocks',
      [MatchupCategory.TURNOVERS]: 'turnovers',
      [MatchupCategory.FIELD_GOAL_PERCENTAGE]: 'fieldGoalPercentage',
      [MatchupCategory.FREE_THROW_PERCENTAGE]: 'freeThrowPercentage',
      [MatchupCategory.MINUTES_PLAYED]: 'minutesPlayed',
    };
    return byCategory[category] ?? null;
  }

  private extractPlayerValue(
    row: SlatePlayerResultRow,
    categories: string[],
  ): number | null {
    const hasDoubleDouble = categories.includes(MatchupCategory.DOUBLE_DOUBLE);
    const hasTripleDouble = categories.includes(MatchupCategory.TRIPLE_DOUBLE);
    if (hasDoubleDouble || hasTripleDouble) {
      const categoryResults = row.categoryResults ?? {};
      const ddCategories = [
        'points',
        'rebounds',
        'assists',
        'steals',
        'blocks',
      ];
      const reached = ddCategories.reduce((count, key) => {
        const value = categoryResults[key]?.value;
        return count + (value != null && value >= 10 ? 1 : 0);
      }, 0);
      if (hasTripleDouble) {
        return reached >= 3 ? 1 : 0;
      }
      return reached >= 2 ? 1 : 0;
    }

    const firstCategory = categories[0];
    if (!firstCategory) {
      return row.points;
    }
    const key = this.getCategoryResultKey(firstCategory);
    if (!key) {
      return null;
    }
    const valueFromCategory = row.categoryResults?.[key]?.value;
    if (valueFromCategory != null) {
      return valueFromCategory;
    }
    if (key === 'points') {
      return row.points;
    }
    return null;
  }

  private summarizeReasons(
    items: Array<{ reason: string }>,
  ): Record<string, number> {
    return items.reduce<Record<string, number>>((acc, item) => {
      acc[item.reason] = (acc[item.reason] ?? 0) + 1;
      return acc;
    }, {});
  }

  private toLimitedPreview<T>(
    items: T[],
    limit = this.slateLogDetailLimit,
  ): {
    total: number;
    shown: number;
    truncated: boolean;
    sample: T[];
  } {
    const sample = items.slice(0, limit);
    return {
      total: items.length,
      shown: sample.length,
      truncated: items.length > limit,
      sample,
    };
  }

  /**
   * Fetches last-night winners from the Python service and updates series scores.
   * Invoked at the start of each slate grading run (not as a standalone cron).
   */
  async handleUpdateGamesAndSeries(scheduleSlot?: string): Promise<void> {
    this.logger.log(
      scheduleSlot
        ? `Starting update games and series before slate slot=${scheduleSlot}.`
        : 'Starting update games and series.',
    );
    const gameDate = DateTime.now()
      .setZone('Asia/Jerusalem')
      .minus({ days: 1 })
      .toISODate();
    if (!gameDate) {
      this.logger.warn('Could not compute game_date for yesterday.');
      return;
    }
    const url = `${this.pythonUrl}${this.lastNightWinnersPath}?game_date=${gameDate}`;
    let data: LastNightWinnersResponse;
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      data = response.data as LastNightWinnersResponse;
      if (!data?.games || !Array.isArray(data.games)) {
        this.logger.log(`No games in response for date ${gameDate}.`);
        return;
      }
    } catch (error: any) {
      this.logger.error(
        `Python service error for last-night-winners: ${error?.message ?? error}`,
        error?.stack,
      );
      throw error;
    }
    const result = await this.seriesService.updateSeriesFromLastNightWinners({
      date: data.date ?? gameDate,
      games: data.games,
    });
    this.logger.log(
      `Last-night-winners summary gameDate=${gameDate} gamesInApi=${data.games.length} bo7Increments=${result.updated} seriesClosed=${result.closed}.`,
    );
    this.logger.log(
      `Last-night-winners detail: ${JSON.stringify(result.details)}`,
    );
  }

  /**
   * Slate grading: runs last-night series update first, then yesterday (Asia/Jerusalem) slate POST,
   * increments currentStats/playerGames, recomputes bet results, then recalculates all users' series
   * and tournament fantasy points (idempotent stat rows via BetStatUpdate; idempotent games via SeriesGameUpdate).
   */
  @Cron('0 0 5 * * *', { timeZone: 'Asia/Jerusalem' })
  async handleSlateGrading05Israel(): Promise<void> {
    await this.runSlateGrading('05:00 Asia/Jerusalem');
  }

  @Cron('0 0 8 * * *', { timeZone: 'Asia/Jerusalem' })
  async handleSlateGrading08Israel(): Promise<void> {
    await this.runSlateGrading('08:00 Asia/Jerusalem');
  }

  private async runSlateGrading(scheduleSlot: string): Promise<void> {
    const normalizePlayerName = (value: string): string =>
      value.trim().toLowerCase();
    const runStartedAtMs = Date.now();
    const runStartedAtIso = new Date(runStartedAtMs).toISOString();
    this.logger.log(
      `Slate run started slot=${scheduleSlot} at=${runStartedAtIso}`,
    );
    try {
      await this.handleUpdateGamesAndSeries(scheduleSlot);

      const gameDate = DateTime.now()
        .setZone('Asia/Jerusalem')
        .minus({ days: 1 })
        .toISODate();
      if (!gameDate) {
        this.logger.warn('Slate: could not compute yesterday gameDate.');
        await this.userSeriesPointsService.updateAllUserPointsTotalFSP();
        this.logger.verbose(
          `Slate slot=${scheduleSlot}: finished all-user points recalc after missing gameDate.`,
        );
        return;
      }

      const [baseBets, spontBets] = await Promise.all([
        this.playerMatchupBetService.findUnsettledBasePointsBetsWithGuesses(),
        this.spontaneousBetService.findUnsettledPointsBetsWithGuesses(),
      ]);
      const allBets: {
        bet: PlayerMatchupBet | SpontaneousBet;
        isSpontaneous: boolean;
      }[] = [
        ...baseBets.map((bet) => ({ bet, isSpontaneous: false as const })),
        ...spontBets.map((bet) => ({ bet, isSpontaneous: true as const })),
      ];

      if (allBets.length === 0) {
        this.logger.log(`Slate ${gameDate}: no unsettled matchup bets.`);
        await this.userSeriesPointsService.updateAllUserPointsTotalFSP();
        this.logger.verbose(
          `Slate slot=${scheduleSlot}: finished all-user points recalc (no bets to grade).`,
        );
        return;
      }

      const playerBets = allBets.flatMap(({ bet }) => {
        const isUnderOver = bet.typeOfMatchup === PlayerMatchupType.UNDEROVER;
        const categories = this.resolveRequestCategories(bet.categories).map(
          (name) => ({ name }),
        );
        if (isUnderOver) {
          return [{ playerName: bet.player1, betId: bet.id, categories }];
        }
        return [
          { playerName: bet.player1, betId: bet.id, categories },
          { playerName: bet.player2, betId: bet.id, categories },
        ];
      });
      this.logger.log(
        `Slate request gameDate=${gameDate} candidateBets=${allBets.length} playerRequests=${playerBets.length}`,
      );
      this.logger.log(
        `Slate request preview: ${JSON.stringify(
          this.toLimitedPreview(
            playerBets.map((entry) => ({
              betId: entry.betId,
              playerName: entry.playerName,
              categories: entry.categories.map((c) => c.name),
            })),
          ),
        )}`,
      );

      let res: Awaited<ReturnType<SlateGradingClient['postGradeSlate']>>;
      try {
        res = await this.slateGradingClient.postGradeSlate({
          gameDate,
          playerBets,
        });
      } catch (e: unknown) {
        this.logger.error(
          `Slate grade HTTP error: ${e instanceof Error ? e.message : e}`,
          e instanceof Error ? e.stack : undefined,
        );
        await this.userSeriesPointsService.updateAllUserPointsTotalFSP();
        this.logger.verbose(
          `Slate slot=${scheduleSlot}: finished all-user points recalc after slate HTTP error.`,
        );
        return;
      }

      if (res.status !== 'success') {
        this.logger.warn(
          `Slate: unexpected status "${res.status}" for gameDate=${gameDate}, skipping updates.`,
        );
        await this.userSeriesPointsService.updateAllUserPointsTotalFSP();
        this.logger.verbose(
          `Slate slot=${scheduleSlot}: finished all-user points recalc after non-success slate status.`,
        );
        return;
      }
      this.logger.log(
        `Slate response gameDate=${res.gameDate} status=${res.status} gameCount=${res.gameCount} playerResultCount=${res.playerResultCount}`,
      );

      const byBetId = new Map<
        string,
        {
          rows: SlatePlayerResultRow[];
          byPlayerName: Map<string, SlatePlayerResultRow>;
        }
      >();
      for (const row of res.playerResults ?? []) {
        if (!row.betId) {
          continue;
        }
        const current = byBetId.get(row.betId) ?? {
          rows: [],
          byPlayerName: new Map<string, SlatePlayerResultRow>(),
        };
        current.rows.push(row);
        const normalizedName = normalizePlayerName(row.playerName);
        // Keep first row behavior to match Array.find semantics.
        if (!current.byPlayerName.has(normalizedName)) {
          current.byPlayerName.set(normalizedName, row);
        }
        byBetId.set(row.betId, current);
      }

      const appliedSummary: Array<{
        betId: string;
        kind: 'base' | 'spontaneous';
        gameId: string;
        player1: string;
        player2: string;
        categories: string[];
        statsBefore: [number, number];
        statsAfter: [number, number];
        playerGamesAfter: [number, number];
        valuesAddedThisSlate: [number, number];
        resultAfter: number | null;
      }> = [];
      const alreadyAppliedSummary: Array<{ betId: string; gameId: string }> =
        [];
      const skippedInvalidGameIdSummary: Array<{
        betId: string;
        reason: string;
      }> = [];
      const skippedUnresolvedSummary: Array<{ betId: string; reason: string }> =
        [];
      const skippedOtherSummary: Array<{ betId: string; reason: string }> = [];

      for (const { bet, isSpontaneous } of allBets) {
        const isUnderOver = bet.typeOfMatchup === PlayerMatchupType.UNDEROVER;
        const categories = (bet.categories ?? []).map(String);
        const lookup = byBetId.get(bet.id);
        const rows = lookup?.rows ?? [];
        const p1 = lookup?.byPlayerName.get(normalizePlayerName(bet.player1));
        const p2 = lookup?.byPlayerName.get(normalizePlayerName(bet.player2));

        if (!p1 || (!isUnderOver && !p2)) {
          this.logger.verbose(
            `Slate skip betId=${bet.id}: missing player row(s) in response (found ${rows.length} rows for betId).`,
          );
          skippedUnresolvedSummary.push({
            betId: bet.id,
            reason: `missing_player_rows(${rows.length}_for_betId)`,
          });
          continue;
        }
        if (
          p1.resolveStatus !== 'resolved' ||
          (!isUnderOver && p2?.resolveStatus !== 'resolved')
        ) {
          skippedUnresolvedSummary.push({
            betId: bet.id,
            reason: `resolveStatus p1=${p1.resolveStatus} p2=${p2?.resolveStatus}`,
          });
          continue;
        }
        const p1Value = this.extractPlayerValue(p1, categories);
        const p2Value = isUnderOver
          ? 0
          : this.extractPlayerValue(p2!, categories);
        if (p1Value == null || (!isUnderOver && p2Value == null)) {
          this.logger.verbose(
            `Slate skip betId=${bet.id}: null category value p1=${p1Value} p2=${p2Value}`,
          );
          skippedUnresolvedSummary.push({
            betId: bet.id,
            reason: `null_category_value p1=${p1Value} p2=${p2Value}`,
          });
          continue;
        }
        if (!p1.gameId || (!isUnderOver && !p2?.gameId)) {
          this.logger.verbose(
            `Slate skip betId=${bet.id}: missing gameId p1=${p1.gameId} p2=${p2?.gameId}`,
          );
          skippedInvalidGameIdSummary.push({
            betId: bet.id,
            reason: `missing_gameId p1=${p1.gameId} p2=${p2?.gameId}`,
          });
          continue;
        }
        if (!isUnderOver && p1.gameId !== p2?.gameId) {
          this.logger.verbose(
            `Slate skip betId=${bet.id}: gameId mismatch p1=${p1.gameId} p2=${p2?.gameId}`,
          );
          skippedInvalidGameIdSummary.push({
            betId: bet.id,
            reason: `gameId_mismatch p1=${p1.gameId} p2=${p2?.gameId}`,
          });
          continue;
        }

        const statsBefore: [number, number] = [
          bet.currentStats?.[0] ?? 0,
          bet.currentStats?.[1] ?? 0,
        ];
        const playerGamesBefore: [number, number] = [
          bet.playerGames?.[0] ?? 0,
          bet.playerGames?.[1] ?? 0,
        ];
        const gameId = p1.gameId;

        try {
          const wasApplied = await this.dataSource.transaction(
            async (manager) => {
              const insertRes = await manager
                .createQueryBuilder()
                .insert()
                .into(BetStatUpdate)
                .values({
                  betId: bet.id,
                  gameId,
                  gameDate,
                  betKind: isSpontaneous ? 'spontaneous' : 'base',
                  categories: (bet.categories ?? []).map(String),
                  player1Name: bet.player1,
                  player2Name: isUnderOver ? null : bet.player2,
                  player1Value: p1Value,
                  player2Value: isUnderOver ? null : p2Value,
                  rawSource: {
                    player1Row: p1,
                    player2Row: isUnderOver ? null : p2,
                  },
                })
                .orIgnore()
                .returning('id')
                .execute();

              if ((insertRes.raw ?? []).length === 0) {
                return false;
              }

              if (!bet.currentStats) {
                bet.currentStats = [0, 0];
              }
              if (!bet.playerGames) {
                bet.playerGames = [0, 0];
              }
              const player2ValueToAdd = isUnderOver ? 0 : (p2Value as number);
              const player2GameToAdd = isUnderOver ? 0 : 1;
              bet.currentStats[0] = (bet.currentStats[0] ?? 0) + p1Value;
              bet.currentStats[1] =
                (bet.currentStats[1] ?? 0) + player2ValueToAdd;
              bet.playerGames[0] = (bet.playerGames[0] ?? 0) + 1;
              bet.playerGames[1] = (bet.playerGames[1] ?? 0) + player2GameToAdd;
              this.recomputeResultForBet(bet);

              await manager.save(
                isSpontaneous ? SpontaneousBet : PlayerMatchupBet,
                bet,
              );
              return true;
            },
          );

          if (!wasApplied) {
            alreadyAppliedSummary.push({ betId: bet.id, gameId });
            continue;
          }

          appliedSummary.push({
            betId: bet.id,
            kind: isSpontaneous ? 'spontaneous' : 'base',
            gameId,
            player1: bet.player1,
            player2: bet.player2,
            categories,
            statsBefore,
            statsAfter: [bet.currentStats[0], bet.currentStats[1]],
            playerGamesAfter: [bet.playerGames[0], bet.playerGames[1]],
            valuesAddedThisSlate: [
              bet.currentStats[0] - statsBefore[0],
              bet.currentStats[1] - statsBefore[1],
            ],
            resultAfter: bet.result ?? null,
          });
        } catch (err) {
          this.logger.error(
            `Slate betId=${bet.id} save/result: ${err instanceof Error ? err.message : err}`,
          );
          bet.currentStats = [...statsBefore];
          bet.playerGames = [...playerGamesBefore];
          skippedOtherSummary.push({
            betId: bet.id,
            reason: `save_error:${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }

      await this.userSeriesPointsService.updateAllUserPointsTotalFSP();
      this.logger.verbose(
        `Slate slot=${scheduleSlot}: finished all-user series and tournament points recalc.`,
      );

      const skipped =
        skippedUnresolvedSummary.length +
        skippedInvalidGameIdSummary.length +
        alreadyAppliedSummary.length +
        skippedOtherSummary.length;
      const unresolvedReasons = this.summarizeReasons(skippedUnresolvedSummary);
      const invalidGameIdReasons = this.summarizeReasons(
        skippedInvalidGameIdSummary,
      );
      const otherReasons = this.summarizeReasons(skippedOtherSummary);
      this.logger.log(
        `Slate summary gameDate=${gameDate} candidates=${allBets.length} applied=${appliedSummary.length} alreadyApplied=${alreadyAppliedSummary.length} skippedInvalidGameId=${skippedInvalidGameIdSummary.length} skippedUnresolved=${skippedUnresolvedSummary.length} skippedOther=${skippedOtherSummary.length} skipped=${skipped} allUsersPointsRecalculated=true gamesInResponse=${(res.games ?? []).length} status=${res.status}.`,
      );
      this.logger.log(
        `Slate reason summary unresolved=${JSON.stringify(unresolvedReasons)} invalidGameId=${JSON.stringify(invalidGameIdReasons)} other=${JSON.stringify(otherReasons)}`,
      );
      if (appliedSummary.length > 0) {
        this.logger.log(
          `Slate applied detail: ${JSON.stringify(this.toLimitedPreview(appliedSummary))}`,
        );
      }
      if (alreadyAppliedSummary.length > 0) {
        this.logger.log(
          `Slate already_applied detail: ${JSON.stringify(this.toLimitedPreview(alreadyAppliedSummary))}`,
        );
      }
      // Skipped details are intentionally omitted to reduce log noise on most days.
    } finally {
      const runDurationMs = Date.now() - runStartedAtMs;
      this.logger.log(
        `Slate run finished slot=${scheduleSlot} startedAt=${runStartedAtIso} durationMs=${runDurationMs}`,
      );
    }
  }
}
