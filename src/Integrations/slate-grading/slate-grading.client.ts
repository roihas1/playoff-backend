import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  SlateGradeRequestDto,
  SlateGradeResponseDto,
} from './dto/slate-grade.dto';

@Injectable()
export class SlateGradingClient {
  private readonly logger = new Logger(SlateGradingClient.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  getBaseUrl(): string {
    return (
      this.configService.get<string>('STATS_SERVICE_BASE_URL')?.trim() ||
      'http://127.0.0.1:8000'
    );
  }

  getGradePath(): string {
    return (
      this.configService.get<string>('STATS_SERVICE_SLATE_GRADE_PATH')?.trim() ||
      '/api/slate/grade'
    );
  }

  getTimeoutMs(): number {
    return this.configService.get<number>('STATS_SERVICE_TIMEOUT_MS', 120000);
  }

  /**
   * POST /api/slate/grade. Optional X-API-Key if STATS_SERVICE_API_KEY is set.
   */
  async postGradeSlate(
    body: SlateGradeRequestDto,
  ): Promise<SlateGradeResponseDto> {
    const base = this.getBaseUrl().replace(/\/$/, '');
    const path = this.getGradePath().startsWith('/')
      ? this.getGradePath()
      : `/${this.getGradePath()}`;
    const url = `${base}${path}`;

    const apiKey = this.configService
      .get<string>('STATS_SERVICE_API_KEY', '')
      ?.trim();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    this.logger.log(
      `Slate grade POST ${url} gameDate=${body.gameDate} players=${body.playerBets.length}`,
    );

    const { data } = await firstValueFrom(
      this.httpService.post<SlateGradeResponseDto>(url, body, {
        headers,
        timeout: this.getTimeoutMs(),
      }),
    );
    return data;
  }
}
