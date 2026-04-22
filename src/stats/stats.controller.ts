import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseBoolPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GetGuessPageStatsDto } from './dto/get-guess-page-stats.dto';
import { StatsService } from './stats.service';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('guess-page')
  getGuessPageStats(
    @Query('tournamentId', new ParseUUIDPipe()) tournamentId: string,
    @Query('leagueId', new ParseUUIDPipe({ optional: true })) leagueId?: string,
    @Query('stage') stage?: string,
    @Query('includeSeries', new DefaultValuePipe(true), ParseBoolPipe)
    includeSeries?: boolean,
    @Query('includeChampion', new DefaultValuePipe(true), ParseBoolPipe)
    includeChampion?: boolean,
  ): Promise<GetGuessPageStatsDto> {
    return this.statsService.getGuessPageStats({
      tournamentId,
      leagueId,
      stage,
      includeSeries: includeSeries ?? true,
      includeChampion: includeChampion ?? true,
    });
  }
}
