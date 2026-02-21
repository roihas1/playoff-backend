import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { DateTime } from 'luxon';
import { SeriesService } from '../series/series.service';
import { LastNightWinnersResponse } from './dto/last-night-winners-response.dto';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private readonly pythonUrl =
    process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8000';
  private readonly lastNightWinnersPath =
    '/api/team/team-stat/last-night-winners';

  constructor(
    private readonly httpService: HttpService,
    private readonly seriesService: SeriesService,
  ) {}

  @Cron('0 8,9 * * *')
  async handleUpdateGamesAndSeries(): Promise<void> {
    this.logger.log('Starting update games and series cron job.');
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
      `Update games and series completed for ${gameDate}: updated=${result.updated}, closed=${result.closed}.`,
    );
  }
}
