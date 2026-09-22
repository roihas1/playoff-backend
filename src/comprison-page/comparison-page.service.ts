import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AuthUserPayload } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { PlayoffsStageService } from 'src/playoffs-stage/playoffs-stage.service';
import { PrivateLeagueService } from 'src/private-league/private-league.service';
import { SeriesService } from 'src/series/series.service';
import { GetComparisonDataDto } from './dto/get-comparison-data.dto';
import { LEGACY_MIGRATION_TOURNAMENT_ID } from 'src/tournament/legacy-migration-tournament.constants';
import { AppCacheService } from 'src/memory-cache/app-cache.service';

@Injectable()
export class ComparisonPageService {
  private logger = new Logger('ComparisonPageService', { timestamp: true });
  constructor(
    private readonly seriesService: SeriesService,
    private readonly playoffsStageService: PlayoffsStageService,
    private readonly privateLeagueService: PrivateLeagueService,
    private readonly appCache: AppCacheService,
  ) {}
  async getComparisonData(
    user: AuthUserPayload,
    tournamentId?: string,
  ): Promise<GetComparisonDataDto> {
    const resolvedTournamentId = tournamentId ?? LEGACY_MIGRATION_TOURNAMENT_ID;
    this.logger.log(
      `Loading comparison page data for user: ${user.username}, tournamentId: ${resolvedTournamentId}.`,
    );
    try {
      const publicKey = this.appCache.buildPublicKey(
        'comparison-page/series-catalog',
        { tournamentId: resolvedTournamentId },
      );
      const userKey = this.appCache.buildUserKey(
        user.id,
        'comparison-page/load',
        { tournamentId: resolvedTournamentId },
      );

      const [{ seriesCatalog, passedStages }, { userLeagues, currentUser }] =
        await Promise.all([
          this.appCache.wrap(publicKey, async () => {
            const [seriesCatalog, passedStages] = await Promise.all([
              this.seriesService.getSeriesCatalog(resolvedTournamentId),
              this.playoffsStageService.getPassedStages(resolvedTournamentId),
            ]);
            return { seriesCatalog, passedStages };
          }),
          this.appCache.wrap(userKey, async () => {
            // getUserLeagues only reads user.id/username; AuthUserPayload (from
            // GetUser()) carries tournament-scoped points, not a full User row.
            const leagues = await this.privateLeagueService.getUserLeagues(
              user as unknown as User,
              resolvedTournamentId,
            );
            return {
              userLeagues: leagues.map((league) => ({
                id: league.id,
                name: league.name,
              })),
              currentUser: {
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                fantasyPoints: user.fantasyPoints,
                championPoints: user.championPoints,
              },
            };
          }),
        ]);

      this.logger.verbose(
        `Loaded comparison page data for user: ${user.username} — series=${seriesCatalog.length}, leagues=${userLeagues.length}.`,
      );

      return {
        tournamentId: resolvedTournamentId,
        currentUser,
        userLeagues,
        passedStages,
        seriesCatalog,
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
