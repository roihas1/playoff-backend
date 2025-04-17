import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { User } from 'src/auth/user.entity';
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
    private readonly authService: AuthService,
    private readonly playoffsStageService: PlayoffsStageService,
    // Add any other services you need
  ) {}

  async getHomepageData(user: User): Promise<HomepageDataDto> {
    this.logger.verbose(`Loading homepage data for user: ${user.username}`);

    try {
      const [userGuessedAll, seriesList, playoffsStages, userPoints] =
        await Promise.all([
          this.seriesService.checkIfUserGuessedAll(user),
          this.seriesService.getSeriesWithFilters({}),
          this.playoffsStageService.getPlainPlayoffsStages(),
          this.userSeriesPointsService.findByUserId(user.id),
        ]);

      this.logger.verbose(
        `Successfully loaded homepage data for ${user.username}`,
      );

      return {
        userGuessedAll,
        seriesList,
        playoffsStages,
        userPoints,
      };
    } catch (error) {
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
