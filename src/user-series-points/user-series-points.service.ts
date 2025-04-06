import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UserSeriesPointsRepository } from './user-series-points.repository';
import { UserSeriesPoints } from './user-series-points.entity';
import { SeriesService } from 'src/series/series.service';
import { User } from 'src/auth/user.entity';
import { AuthService } from 'src/auth/auth.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UserSeriesPointsService {
  private logger = new Logger('UserSeriesPointsService', { timestamp: true });
  constructor(
    private userSeriesPointsRepository: UserSeriesPointsRepository,
    private seriesService: SeriesService,
    private authService: AuthService,
  ) {}

  async updatePointsForUser(user: User): Promise<void> {
    try {
      const seriesPoints =
        await this.seriesService.getPointsPerSeriesForUser(user);

      for (const [seriesId, points] of Object.entries(seriesPoints)) {
        const existing = await this.userSeriesPointsRepository.findOneBy({
          user: { id: user.id },
          series: { id: seriesId },
        });

        if (existing) {
          existing.points = points;
          await this.userSeriesPointsRepository.save(existing);
        } else {
          const newEntry = this.userSeriesPointsRepository.create({
            user: { id: user.id } as any,
            series: { id: seriesId } as any,
            points,
          });
          await this.userSeriesPointsRepository.save(newEntry);
        }
      }

      this.logger.log(`Updated series points for user ${user.username}`);
    } catch (error) {
      this.logger.error(
        `Failed to update series points for user ${user.username}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Could not update series points for user ${user.username}`,
      );
    }
  }

  async findAll(): Promise<UserSeriesPoints[]> {
    try {
      return await this.userSeriesPointsRepository.find();
    } catch (error) {
      this.logger.error('Failed to fetch all user-series points', error.stack);
      throw new InternalServerErrorException(
        'Failed to fetch all user-series points',
      );
    }
  }

  async findByUserId(userId: string): Promise<{ [seriesId: string]: number }> {
    try {
      const entries = await this.userSeriesPointsRepository
        .createQueryBuilder('usp')
        .select(['usp.points AS points', 'series.id AS seriesId'])
        .innerJoin('usp.series', 'series')
        .where('usp.userId = :userId', { userId })
        .getRawMany();
      const result: { [seriesId: string]: number } = {};

      for (const entry of entries) {
        if (entry.seriesid) {
          result[entry.seriesid] = entry.points;
        }
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to fetch points for user: ${userId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch points for user: ${userId}`,
      );
    }
  }

  async findBySeriesId(seriesId: string): Promise<UserSeriesPoints[]> {
    try {
      return await this.userSeriesPointsRepository.find({
        where: { series: { id: seriesId } },
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch points for series: ${seriesId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch points for series: ${seriesId}`,
      );
    }
  }

  async findByUserAndSeries(
    userId: string,
    seriesId: string,
  ): Promise<UserSeriesPoints | null> {
    try {
      return await this.userSeriesPointsRepository.findOne({
        where: {
          user: { id: userId },
          series: { id: seriesId },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch points for user: ${userId} and series: ${seriesId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to fetch points for user: ${userId} and series: ${seriesId}`,
      );
    }
  }
  async updateAllUserPoints() {
    this.logger.log('Starting daily update of series points for all users...');
    try {
      const users = await this.authService.getAllUsers();
      for (const user of users) {
        await this.updatePointsForUser(user);
      }
      this.logger.log('Finished updating series points for all users.');
    } catch (error) {
      this.logger.error(`Cron job failed: ${error.message}`, error.stack);
    }
  }
  // @Cron(CronExpression.EVERY_DAY_AT_6PM)
  @Cron('15 15 * * *') // 15:15 UTC = 18:15 Israel time
  async handleDailyPointsUpdate() {
    this.logger.log('Starting daily user-series-points update...');
    try {
      const allUsers = await this.authService.getAllUsers(); // create this function to return users with just id
      for (const user of allUsers) {
        await this.updatePointsForUser(user);
      }
      this.logger.log('✅ Daily user-series-points update completed.');
    } catch (error) {
      this.logger.error('❌ Error in daily update', error.stack);
    }
  }
}
