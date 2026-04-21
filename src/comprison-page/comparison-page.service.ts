import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { User } from 'src/auth/user.entity';
import { PlayoffsStageService } from 'src/playoffs-stage/playoffs-stage.service';
import { PrivateLeagueService } from 'src/private-league/private-league.service';
import { SeriesService } from 'src/series/series.service';
import { GetComparisonDataDto } from './dto/get-comparison-data.dto';
import { LEGACY_MIGRATION_TOURNAMENT_ID } from 'src/tournament/legacy-migration-tournament.constants';

@Injectable()
export class ComparisonPageService {
  private logger = new Logger('ComparisonPageService', { timestamp: true });
  constructor(
    private readonly authService: AuthService,
    private readonly seriesService: SeriesService,
    private readonly playoffsStageService: PlayoffsStageService,
    private readonly privateLeagueService: PrivateLeagueService,
  ) {}
  async getComparisonData(
    user: User,
    tournamentId?: string,
  ): Promise<GetComparisonDataDto> {
    try {
      const resolvedTournamentId =
        tournamentId ?? LEGACY_MIGRATION_TOURNAMENT_ID;
      const [allBets, userLeagues, allUsers, passedStages] = await Promise.all([
        this.seriesService.getAllBets(resolvedTournamentId),
        this.privateLeagueService.getUserLeagues(user, resolvedTournamentId),
        this.authService.getAllUsersWithSelection(resolvedTournamentId),
        this.playoffsStageService.getPassedStages(resolvedTournamentId),
      ]);

      return {
        tournamentId: resolvedTournamentId,
        allBets,
        userLeagues,
        allUsers,
        passedStages,
        currentUser: user,
      };
    } catch (error) {
      this.logger.error(
        `Failed to load comparison data for user: ${user.username}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to load comparison data');
    }
  }
}
