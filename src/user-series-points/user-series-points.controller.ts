import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
  Post,
  Patch,
} from '@nestjs/common';
import { UserSeriesPointsService } from './user-series-points.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';

@Controller('user-series-points')
@UseGuards(JwtAuthGuard)
export class UserSeriesPointsController {
  constructor(
    private readonly userSeriesPointsService: UserSeriesPointsService,
  ) {}

  // Get all user-series points
  @Get()
  async getAllPoints() {
    return this.userSeriesPointsService.findAll();
  }

  // Get points for a specific user
  @Get('user')
  async getPointsForUser(@GetUser() user: User) {
    return this.userSeriesPointsService.findByUserId(user.id);
  }

  // Get points for a specific series
  @Get('series/:seriesId')
  async getPointsForSeries(@Param('seriesId') seriesId: string) {
    return this.userSeriesPointsService.findBySeriesId(seriesId);
  }

  // Get points for a specific user and series
  @Get('user/series/:seriesId')
  async getPointsForUserInSeries(
    @GetUser() user: User,
    @Param('seriesId') seriesId: string,
  ) {
    const result = await this.userSeriesPointsService.findByUserAndSeries(
      user.id,
      seriesId,
    );
    if (!result) {
      throw new NotFoundException('User-Series Points not found');
    }
    return result;
  }
  @Patch('user/updatePoints')
  async updatePointsForUser(@GetUser() user: User): Promise<void> {
    return this.userSeriesPointsService.updatePointsForUser(user);
  }
  @Patch('user/updatePoints/all')
  async updatePointsForAllUsers(): Promise<void> {
    return this.userSeriesPointsService.updateAllUserPoints();
  }
}
