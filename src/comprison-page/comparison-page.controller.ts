import {
  Controller,
  Get,
  ParseUUIDPipe,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ComparisonPageService } from './comparison-page.service';
import { AuthUserPayload, GetUser } from 'src/auth/get-user.decorator';
import { GetComparisonDataDto } from './dto/get-comparison-data.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { MergeUserTournamentPointsInterceptor } from 'src/user-tournament-points/merge-user-tournament-points.interceptor';

@Controller('comparison-page')
@UseGuards(JwtAuthGuard)
@UseInterceptors(MergeUserTournamentPointsInterceptor)
export class ComparisonPageController {
  constructor(private readonly comparisonService: ComparisonPageService) {}

  @Get('load')
  async getComparisonData(
    @GetUser() user: AuthUserPayload,
    @Query('tournamentId', new ParseUUIDPipe({ optional: true }))
    tournamentId?: string,
  ): Promise<GetComparisonDataDto> {
    return this.comparisonService.getComparisonData(user, tournamentId);
  }
}
