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

@Injectable()
export class ComparisonPageService {
  private logger = new Logger('ComparisonPageService', { timestamp: true });
  constructor(
    private readonly authService: AuthService,
    private readonly seriesService: SeriesService,
    private readonly playoffsStageService: PlayoffsStageService,
    private readonly privateLeagueService: PrivateLeagueService,
  ) {}
  async getComparisonData(user: User): Promise<GetComparisonDataDto> {
    try {
      const [allBets, userLeagues, allUsers, passedStages] = await Promise.all([
        this.seriesService.getAllBets(),
        this.privateLeagueService.getUserLeagues(user),
        this.authService.getAllUsers(),
        this.playoffsStageService.getPassedStages(),
      ]);

      return {
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
