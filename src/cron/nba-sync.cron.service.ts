import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DateTime } from 'luxon';
import { BalldontlieClient } from 'src/Integrations/Balldontlie/balldontlie.client';
import { BalldontlieGameDto } from 'src/Integrations/Balldontlie/dto/balldontlie-game.dto';
import { TeamService } from 'src/team/team.service';
import { SeriesService } from '../series/series.service';
import { ProcessedNbaGameRepository } from './processed-nba-game.repository';

const SCHEDULE_TIMEZONE = 'Asia/Jerusalem';
const UPCOMING_WINDOW_DAYS = 14;
const FINAL_STATUS = 'Final';

interface FinishedSyncSummary {
  fetched: number;
  processed: number;
  skippedAlreadyProcessed: number;
  skippedNoSeries: number;
  skippedUnknownTeam: number;
  closed: number;
}

interface UpcomingSyncSummary {
  fetched: number;
  scheduleUpdates: number;
  unchanged: number;
  skippedNoSeries: number;
  skippedInvalidTime: number;
}

@Injectable()
export class NbaSyncCronService {
  private readonly logger = new Logger('NbaSyncCronService', {
    timestamp: true,
  });

  constructor(
    private readonly balldontlieClient: BalldontlieClient,
    private readonly seriesService: SeriesService,
    private readonly teamService: TeamService,
    private readonly processedNbaGameRepository: ProcessedNbaGameRepository,
  ) {}

  @Cron('0 9 * * *', { timeZone: SCHEDULE_TIMEZONE })
  async handleDailyNbaSync(): Promise<void> {
    this.logger.log('Starting daily NBA sync cron job.');
    const now = DateTime.now().setZone(SCHEDULE_TIMEZONE);
    const yesterday = now.minus({ days: 1 }).toISODate();
    const today = now.toISODate();
    const horizon = now.plus({ days: UPCOMING_WINDOW_DAYS }).toISODate();

    if (!yesterday || !today || !horizon) {
      this.logger.warn('Could not compute sync window dates; aborting.');
      return;
    }

    await this.runFinishedGamesStep(yesterday);
    await this.runUpcomingGamesStep(today, horizon);
  }

  private async runFinishedGamesStep(date: string): Promise<void> {
    try {
      const summary = await this.syncFinishedGames(date);
      this.logger.verbose(
        `Finished games sync for ${date}: fetched=${summary.fetched}, processed=${summary.processed}, closed=${summary.closed}, skippedAlreadyProcessed=${summary.skippedAlreadyProcessed}, skippedNoSeries=${summary.skippedNoSeries}, skippedUnknownTeam=${summary.skippedUnknownTeam}.`,
      );
    } catch (error: any) {
      this.logger.error(
        `Finished games sync failed for ${date}: ${error?.message ?? error}`,
        error?.stack,
      );
    }
  }

  private async runUpcomingGamesStep(
    today: string,
    horizon: string,
  ): Promise<void> {
    try {
      const summary = await this.syncUpcomingSeriesSchedules(today, horizon);
      this.logger.verbose(
        `Upcoming games sync for [${today} -> ${horizon}]: fetched=${summary.fetched}, scheduleUpdates=${summary.scheduleUpdates}, unchanged=${summary.unchanged}, skippedNoSeries=${summary.skippedNoSeries}, skippedInvalidTime=${summary.skippedInvalidTime}.`,
      );
    } catch (error: any) {
      this.logger.error(
        `Upcoming games sync failed for [${today} -> ${horizon}]: ${error?.message ?? error}`,
        error?.stack,
      );
    }
  }

  private async syncFinishedGames(
    date: string,
  ): Promise<FinishedSyncSummary> {
    const games = await this.balldontlieClient.getGamesByDate(date);
    const finished = games.filter((g) => this.isFinished(g));
    const summary: FinishedSyncSummary = {
      fetched: finished.length,
      processed: 0,
      skippedAlreadyProcessed: 0,
      skippedNoSeries: 0,
      skippedUnknownTeam: 0,
      closed: 0,
    };

    for (const game of finished) {
      try {
        await this.applyFinishedGame(game, date, summary);
      } catch (error: any) {
        this.logger.error(
          `Failed to apply finished game ${game.id}: ${error?.message ?? error}`,
          error?.stack,
        );
      }
    }

    return summary;
  }

  private async applyFinishedGame(
    game: BalldontlieGameDto,
    date: string,
    summary: FinishedSyncSummary,
  ): Promise<void> {
    const externalGameId = String(game.id);
    if (await this.processedNbaGameRepository.existsByGameId(externalGameId)) {
      summary.skippedAlreadyProcessed += 1;
      return;
    }

    const winnerAbbr = this.resolveWinnerAbbr(game);
    if (!winnerAbbr) {
      this.logger.verbose(
        `Game ${externalGameId} has no winner abbreviation (tie or missing scores); skipping.`,
      );
      return;
    }

    const team = await this.teamService.findByAbbreviation(winnerAbbr);
    if (!team) {
      summary.skippedUnknownTeam += 1;
      this.logger.verbose(
        `Unknown team abbreviation ${winnerAbbr} for game ${externalGameId}; skipping.`,
      );
      return;
    }

    const series = await this.seriesService.getInProgressSeriesByTeamId(
      team.id,
    );
    if (!series) {
      summary.skippedNoSeries += 1;
      this.logger.verbose(
        `No in-progress series for team ${team.id} (${winnerAbbr}); skipping game ${externalGameId}.`,
      );
      return;
    }

    const result = await this.seriesService.updateSeriesFromLastNightWinners({
      date,
      games: [{ gameId: externalGameId, winnerTeamId: team.id }],
    });

    if (result.updated > 0) {
      summary.processed += 1;
      summary.closed += result.closed;
      await this.processedNbaGameRepository.markProcessed(
        externalGameId,
        series.id,
      );
    }
  }

  private async syncUpcomingSeriesSchedules(
    today: string,
    horizon: string,
  ): Promise<UpcomingSyncSummary> {
    const games = await this.balldontlieClient.getGamesByDateRange(
      today,
      horizon,
    );
    const upcoming = games.filter((g) => !this.isFinished(g));
    const summary: UpcomingSyncSummary = {
      fetched: upcoming.length,
      scheduleUpdates: 0,
      unchanged: 0,
      skippedNoSeries: 0,
      skippedInvalidTime: 0,
    };

    for (const game of upcoming) {
      try {
        await this.applyUpcomingGame(game, summary);
      } catch (error: any) {
        this.logger.error(
          `Failed to apply upcoming game ${game.id}: ${error?.message ?? error}`,
          error?.stack,
        );
      }
    }

    return summary;
  }

  private async applyUpcomingGame(
    game: BalldontlieGameDto,
    summary: UpcomingSyncSummary,
  ): Promise<void> {
    const homeAbbr = game.home_team?.abbreviation;
    const visitorAbbr = game.visitor_team?.abbreviation;
    if (!homeAbbr || !visitorAbbr) {
      return;
    }

    const schedule = this.resolveJerusalemSchedule(game);
    if (!schedule) {
      summary.skippedInvalidTime += 1;
      return;
    }

    const result = await this.seriesService.updateSeriesScheduleByTeams({
      team1Abbr: homeAbbr,
      team2Abbr: visitorAbbr,
      dateOfStart: schedule.dateOfStart,
      timeOfStart: schedule.timeOfStart,
    });

    if (!result.seriesId) {
      summary.skippedNoSeries += 1;
      return;
    }

    if (result.updated) {
      summary.scheduleUpdates += 1;
    } else {
      summary.unchanged += 1;
    }
  }

  private isFinished(game: BalldontlieGameDto): boolean {
    return (game.status ?? '').trim().toLowerCase() === FINAL_STATUS.toLowerCase();
  }

  private resolveWinnerAbbr(game: BalldontlieGameDto): string | null {
    const home = game.home_team_score ?? 0;
    const visitor = game.visitor_team_score ?? 0;
    if (home === visitor) return null;
    return home > visitor
      ? (game.home_team?.abbreviation ?? null)
      : (game.visitor_team?.abbreviation ?? null);
  }

  private resolveJerusalemSchedule(
    game: BalldontlieGameDto,
  ): { dateOfStart: string; timeOfStart: string } | null {
    const candidate = this.parseUpcomingStart(game);
    if (!candidate) return null;
    const local = candidate.setZone(SCHEDULE_TIMEZONE);
    const dateOfStart = local.toISODate();
    const timeOfStart = local.toFormat('HH:mm:ss');
    if (!dateOfStart) return null;
    return { dateOfStart, timeOfStart };
  }

  private parseUpcomingStart(game: BalldontlieGameDto): DateTime | null {
    const fromStatus = DateTime.fromISO(game.status ?? '', { zone: 'utc' });
    if (fromStatus.isValid) return fromStatus;

    const fromDate = DateTime.fromISO(game.date ?? '', { zone: 'utc' });
    if (fromDate.isValid) return fromDate;

    return null;
  }
}
