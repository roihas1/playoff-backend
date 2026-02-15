// services/NbaStatisticsService.ts
import { RequestInit } from 'node-fetch'; // או מהספרייה שאתה משתמש בה

export class NbaStatisticsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://127.0.0.1:8000'; // כתובת שרת הפייתון
  }

  // פונקציית עזר לטיפול בבקשות ושגיאות
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Fetch error for ${endpoint}:`, error);
      throw error; 
    }
  }

  // פונקציית עזר לבניית Query String
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

  // 1. Boxscore Daily
  // Endpoint: /api/team/team-stat/boxscore/daily?game_date=YYYY-MM-DD
  async fetchDailyBoxScores(game_date?: string) {
    const query = this.buildQueryString({ game_date });
    return this.request(`/api/team/team-stat/boxscore/daily${query}`);
  }

  // 2. Player Stats (Team Context)
  // Endpoint: /api/team/team-stat/player-stats?teamId=...&season=...
  async fetchTeamPlayerStats(teamId?: string, season?: string) {
    const query = this.buildQueryString({ teamId, season });
    return this.request(`/api/team/team-stat/player-stats${query}`);
  }

  // 3. Historical Averages (POST)
  // מקבל JSON ב-Body, אין שינוי
  async fetchHistoricalAverages(payload: any) {
    return this.request('/api/player/historical-averages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  // 4. Top Scorers
  // Endpoint: /api/player/getTopScoringPlayers?topN=50
  async fetchTopScorers(topN?: number) {
    const query = this.buildQueryString({ topN });
    return this.request(`/api/player/getTopScoringPlayers${query}`);
  }

  // 5. Player Season Averages
  // Endpoint: /api/player/{player_id}/averages?season=YYYY-YY
  async fetchPlayerSeasonStats(playerId: string, season?: string) {
    const query = this.buildQueryString({ season });
    return this.request(`/api/player/${playerId}/averages${query}`);
  }

  // 6. Averages vs Opponent
  // Endpoint: /api/player/averages-vs-opponent?player_name=...&opponent_team_name=...&season=...
  async fetchStatsVsOpponent(queryParams: any) {
    const query = this.buildQueryString(queryParams);
    return this.request(`/api/player/averages-vs-opponent${query}`);
  }
}