// src/StatisticsApi/services/NbaStatisticsService.ts
import { Injectable, Logger } from '@nestjs/common'; // הוספת Injectable ו-Logger

type FetchOptions = NonNullable<Parameters<typeof fetch>[1]>;

@Injectable() // הוספת הדקורטור
export class NbaStatisticsService {
  private baseUrl: string;
  // הגדרת הלוגר כפי שרועי ביקש
  private readonly logger = new Logger('NbaStatisticsService', {
    timestamp: true,
  });

  constructor() {
    this.baseUrl = 'http://127.0.0.1:8000'; // כתובת שרת הפייתון
  }

  private async request(endpoint: string, options: FetchOptions = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      this.logger.log(`Sending request to: ${endpoint}`); // לוג לפני שליחה
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // החלפת console.error בלוגר של NestJS
      this.logger.error(
        `Fetch error for ${endpoint}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  async fetchDailyBoxScores(game_date?: string) {
    this.logger.log(
      `Fetching daily box scores for date: ${game_date || 'today'}`,
    );
    const query = this.buildQueryString({ game_date });
    return this.request(`/api/team/team-stat/boxscore/daily${query}`);
  }

  async fetchTeamPlayerStats(teamId?: string, season?: string) {
    this.logger.log(
      `Fetching team player stats: Team ${teamId}, Season ${season}`,
    );
    const query = this.buildQueryString({ teamId, season });
    return this.request(`/api/team/team-stat/player-stats${query}`);
  }

  async fetchHistoricalAverages(payload: any) {
    this.logger.log('Fetching historical averages via POST');
    return this.request('/api/player/historical-averages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  async fetchTopScorers(topN?: number) {
    this.logger.log(`Fetching top ${topN || 50} scorers`);
    const query = this.buildQueryString({ topN });
    return this.request(`/api/player/getTopScoringPlayers${query}`);
  }

  async fetchPlayerSeasonStats(playerId: string, season?: string) {
    this.logger.log(
      `Fetching season stats for player ${playerId}, Season: ${season}`,
    );
    const query = this.buildQueryString({ season });
    return this.request(`/api/player/${playerId}/averages${query}`);
  }

  async fetchStatsVsOpponent(queryParams: any) {
    this.logger.log(
      `Fetching stats vs opponent for: ${queryParams.player_name}`,
    );
    const query = this.buildQueryString(queryParams);
    return this.request(`/api/player/averages-vs-opponent${query}`);
  }
}
