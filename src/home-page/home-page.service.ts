import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { User } from 'src/auth/user.entity';
import { LEGACY_MIGRATION_TOURNAMENT_ID } from 'src/tournament/legacy-migration-tournament.constants';
import { PlayoffsStageService } from 'src/playoffs-stage/playoffs-stage.service';
import { SeriesService } from 'src/series/series.service';
import { UserSeriesPointsService } from 'src/user-series-points/user-series-points.service';
import { HomepageDataDto } from './dto/home-page-data.dto';

@Injectable()
export class HomePageService {
  private logger = new Logger('HomePageService', { timestamp: true });
  constructor(
    private readonly seriesService: SeriesService,
    private readonly userSeriesPointsService: UserSeriesPointsService,
    private readonly playoffsStageService: PlayoffsStageService,
    private readonly authService: AuthService,
  ) {}

  async getHomepageData(
    user: User,
    tournamentId?: string,
  ): Promise<HomepageDataDto> {
    this.logger.verbose(`Loading homepage data for user: ${user.username}`);

    try {
      const [seriesList, playoffsStages, userPoints, leagueStandingsPreview] =
        await Promise.all([
          this.seriesService.getSeriesForHomePage(tournamentId),
          this.playoffsStageService.getPlainPlayoffsStages(
            tournamentId ?? LEGACY_MIGRATION_TOURNAMENT_ID,
          ),
          this.userSeriesPointsService.findByUserId(user.id, tournamentId),
          tournamentId
            ? this.authService.getHomeStandingsPreview(user, tournamentId)
            : Promise.resolve(null),
        ]);
      const userGuessedAll = await this.seriesService.checkIfUserGuessedAll(
        user,
        tournamentId,
        seriesList.map((series) => series.id),
      );

      this.logger.verbose(
        `Successfully loaded homepage data for ${user.username}`,
      );

      return {
        userGuessedAll,
        seriesList,
        playoffsStages,
        userPoints,
        leagueStandingsPreview,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `Failed to load homepage data for user: ${user.username}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to load homepage data. Please try again later.',
      );
    }
  }
}
