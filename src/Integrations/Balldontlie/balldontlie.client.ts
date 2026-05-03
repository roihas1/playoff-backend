import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { DateTime } from 'luxon';
import {
  BalldontlieGameDto,
  BalldontlieGamesResponse,
} from './dto/balldontlie-game.dto';

const GAMES_PATH = '/games';
const PER_PAGE = 100;
const MAX_PAGES = 20;

@Injectable()
export class BalldontlieClient {
  private readonly logger = new Logger('BalldontlieClient', { timestamp: true });
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'BALLDONTLIE_BASE_URL',
      'https://api.balldontlie.io/v1',
    );
    const key = this.configService.get<string>('BALLDONTLIE_API_KEY');
    this.apiKey = key && key.length > 0 ? key : undefined;
  }

  async getGamesByDate(date: string): Promise<BalldontlieGameDto[]> {
    return this.fetchGames({ 'dates[]': [date] });
  }

  async getGamesByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<BalldontlieGameDto[]> {
    const dates = this.expandDateRange(startDate, endDate);
    if (dates.length === 0) {
      return [];
    }
    return this.fetchGames({ 'dates[]': dates });
  }

  private async fetchGames(
    params: Record<string, string | string[]>,
  ): Promise<BalldontlieGameDto[]> {
    const headers = this.buildHeaders();
    const collected: BalldontlieGameDto[] = [];
    let cursor: number | null | undefined;
    let pages = 0;

    do {
      const requestParams = this.buildParams(params, cursor);
      const response = await this.requestGames(requestParams, headers);
      collected.push(...response.data);
      cursor = response.meta?.next_cursor ?? null;
      pages += 1;
    } while (cursor && pages < MAX_PAGES);

    if (pages >= MAX_PAGES && cursor) {
      this.logger.warn(
        `Balldontlie pagination cap reached (${MAX_PAGES} pages); results may be truncated.`,
      );
    }

    return collected;
  }

  private async requestGames(
    params: Record<string, string | string[] | number>,
    headers: Record<string, string>,
  ): Promise<BalldontlieGamesResponse> {
    const url = `${this.baseUrl}${GAMES_PATH}`;
    try {
      const response = await firstValueFrom(
        this.httpService.get<BalldontlieGamesResponse>(url, {
          params,
          headers,
        }),
      );
      const body = response.data;
      return {
        data: Array.isArray(body?.data) ? body.data : [],
        meta: body?.meta,
      };
    } catch (error: any) {
      this.logger.error(
        `Balldontlie request failed: ${error?.message ?? error}`,
        error?.stack,
      );
      throw error;
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.apiKey) {
      headers.Authorization = this.apiKey;
    }
    return headers;
  }

  private buildParams(
    base: Record<string, string | string[]>,
    cursor: number | null | undefined,
  ): Record<string, string | string[] | number> {
    const params: Record<string, string | string[] | number> = {
      ...base,
      per_page: PER_PAGE,
    };
    if (cursor !== null && cursor !== undefined) {
      params.cursor = cursor;
    }
    return params;
  }

  private expandDateRange(startDate: string, endDate: string): string[] {
    const start = DateTime.fromISO(startDate);
    const end = DateTime.fromISO(endDate);
    if (!start.isValid || !end.isValid || end < start) {
      return [];
    }
    const dates: string[] = [];
    let cursor = start;
    while (cursor <= end) {
      dates.push(cursor.toISODate() ?? '');
      cursor = cursor.plus({ days: 1 });
    }
    return dates.filter((d) => d.length > 0);
  }
}
