// controllers/NbaController.ts
import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { NbaStatisticsService } from '../services/NbaStatisticsService';

@Controller('api/nba') // <--- ה-Decorator שהיה חסר
export class NbaController {
  
  // ב-NestJS מזריקים את הסרוויס בבנאי (Dependency Injection) במקום לעשות new
  constructor(private readonly service: NbaStatisticsService) {}

  // 1. GET /boxscore?date=...
  @Get('boxscore')
  async getDailyBoxScores(@Query('date') date: string) {
    return this.service.fetchDailyBoxScores(date);
  }

  // 2. GET /team-stats?teamId=...&season=...
  @Get('team-stats')
  async getTeamPlayerStats(
    @Query('teamId') teamId: string,
    @Query('season') season: string
  ) {
    return this.service.fetchTeamPlayerStats(teamId, season);
  }

  // 3. POST /historical (מקבל JSON ב-Body)
  @Post('historical')
  async getHistoricalAverages(@Body() body: any) {
    return this.service.fetchHistoricalAverages(body);
  }

  // 4. GET /top-scorers?topN=...
  @Get('top-scorers')
  async getTopScorers(@Query('topN') topN: string) {
    // ממירים למספר אם קיים, אחרת undefined
    const limit = topN ? parseInt(topN) : undefined;
    return this.service.fetchTopScorers(limit);
  }

  // 5. GET /player/:id/season?season=...
  @Get('player/:id/season')
  async getPlayerSeasonStats(
    @Param('id') id: string,
    @Query('season') season: string
  ) {
    return this.service.fetchPlayerSeasonStats(id, season);
  }

  // 6. GET /matchup?player_name=...
  @Get('matchup')
  async getStatsVsOpponent(@Query() query: any) {
    return this.service.fetchStatsVsOpponent(query);
  }
}