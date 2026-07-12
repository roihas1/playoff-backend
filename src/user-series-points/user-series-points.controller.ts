import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
  Patch,
  Logger,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserSeriesPointsService } from './user-series-points.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { Role } from 'src/auth/user-role.enum';
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
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async getAllPoints() {
    this.logger.verbose('Attempting to fetch all user-series points...');
    return this.userSeriesPointsService.findAll();
  }

  @Get('/user')
  async getPointsForUser(
    @GetUser() user: User,
    @Query('tournamentId', new ParseUUIDPipe({ optional: true }))
    tournamentId?: string,
  ) {
    this.logger.verbose(
      `Attempting to fetch series points for user: ${user.username}`,
    );
    return this.userSeriesPointsService.findByUserId(user.id, tournamentId);
  }

  @Get('/series/:seriesId')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
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
    return this.userSeriesPointsService.updatePointsForUser(user.id);
  }

  @Patch('/user/updatePoints/all')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async updatePointsForAllUsers(): Promise<void> {
    this.logger.verbose('Attempting to update points for all users...');
    return this.userSeriesPointsService.updateAllUserPoints();
  }
}
