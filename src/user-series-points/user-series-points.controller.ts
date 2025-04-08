import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
  Post,
  Patch,
  Logger,
} from '@nestjs/common';
import { UserSeriesPointsService } from './user-series-points.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';

@Controller('user-series-points')
@UseGuards(JwtAuthGuard)
export class UserSeriesPointsController {
  private logger = new Logger('UserSeriesPointsController', {
    timestamp: true,
  });

  constructor(
    private readonly userSeriesPointsService: UserSeriesPointsService,
  ) {}

  @Get()
  async getAllPoints() {
    this.logger.verbose('Attempting to fetch all user-series points...');
    return this.userSeriesPointsService.findAll();
  }

  @Get('/user')
  async getPointsForUser(@GetUser() user: User) {
    this.logger.verbose(
      `Attempting to fetch series points for user: ${user.username}`,
    );
    return this.userSeriesPointsService.findByUserId(user.id);
  }

  @Get('/series/:seriesId')
  async getPointsForSeries(@Param('seriesId') seriesId: string) {
    this.logger.verbose(
      `Attempting to fetch all user points for series: ${seriesId}`,
    );
    return this.userSeriesPointsService.findBySeriesId(seriesId);
  }

  @Get('/user/series/:seriesId')
  async getPointsForUserInSeries(
    @GetUser() user: User,
    @Param('seriesId') seriesId: string,
  ) {
    this.logger.verbose(
      `Attempting to fetch points for user: ${user.username} in series: ${seriesId}`,
    );
    const result = await this.userSeriesPointsService.findByUserAndSeries(
      user.id,
      seriesId,
    );
    if (!result) {
      this.logger.warn(
        `No points found for user: ${user.username} in series: ${seriesId}`,
      );
      throw new NotFoundException('User-Series Points not found');
    }
    return result;
  }

  @Patch('/user/updatePoints')
  async updatePointsForUser(@GetUser() user: User): Promise<void> {
    this.logger.verbose(
      `Attempting to update points for user: ${user.username}`,
    );
    return this.userSeriesPointsService.updatePointsForUser(user);
  }

  @Patch('/user/updatePoints/all')
  async updatePointsForAllUsers(): Promise<void> {
    this.logger.verbose('Attempting to update points for all users...');
    return this.userSeriesPointsService.updateAllUserPoints();
  }
}
