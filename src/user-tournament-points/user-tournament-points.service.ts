import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from 'src/auth/user.entity';
import { UserTournamentPointsRepository } from './user-tournament-points.repository';

@Injectable()
export class UserTournamentPointsService {
  private logger = new Logger('UserTournamentPointsService', {
    timestamp: true,
  });

  constructor(
    private readonly userTournamentPointsRepository: UserTournamentPointsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async getPointsForUser(
    userId: string,
    tournamentId: string,
  ): Promise<{ fantasyPoints: number; championPoints: number }> {
    const row = await this.userTournamentPointsRepository.findOne({
      where: {
        user: { id: userId },
        tournament: { id: tournamentId },
      },
    });
    return {
      fantasyPoints: row?.fantasyPoints ?? 0,
      championPoints: row?.championPoints ?? 0,
    };
  }

  async incrementFantasyPoints(
    userId: string,
    tournamentId: string,
    delta: number,
  ): Promise<void> {
    if (delta === 0) {
      return;
    }
    try {
      await this.dataSource.transaction((manager) =>
        this.userTournamentPointsRepository.incrementFantasyPoints(
          userId,
          tournamentId,
          delta,
          manager,
        ),
      );
    } catch (error) {
      this.logger.error(
        `incrementFantasyPoints failed for user ${userId}, tournament ${tournamentId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not update tournament fantasy points',
      );
    }
  }

  async incrementChampionPoints(
    userId: string,
    tournamentId: string,
    delta: number,
  ): Promise<void> {
    if (delta === 0) {
      return;
    }
    try {
      await this.dataSource.transaction((manager) =>
        this.userTournamentPointsRepository.incrementChampionPoints(
          userId,
          tournamentId,
          delta,
          manager,
        ),
      );
    } catch (error) {
      this.logger.error(
        `incrementChampionPoints failed for user ${userId}, tournament ${tournamentId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not update tournament champion points',
      );
    }
  }

  /**
   * Replaces fantasyPoints on user_tournament_points with per-tournament sums from user_series_points
   * (series must have tournamentId set; others are ignored).
   */
  async recalculateFantasyFromUserSeriesPoints(userId: string): Promise<void> {
    try {
      await this.dataSource.transaction((manager) =>
        this.userTournamentPointsRepository.applyFantasyTotalsFromUserSeriesPoints(
          userId,
          manager,
        ),
      );
      this.logger.log(
        `Recalculated tournament fantasy totals from series points for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `recalculateFantasyFromUserSeriesPoints failed for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not recalculate tournament fantasy points from series totals',
      );
    }
  }

  async recalculateFantasyFromUserSeriesPointsForAllUsers(): Promise<void> {
    this.logger.log(
      'Starting recalculateFantasyFromUserSeriesPoints for all users...',
    );
    try {
      const users = await this.dataSource.getRepository(User).find({
        select: { id: true },
      });
      for (const { id } of users) {
        await this.recalculateFantasyFromUserSeriesPoints(id);
      }
      this.logger.log(
        'Finished recalculateFantasyFromUserSeriesPoints for all users.',
      );
    } catch (error) {
      this.logger.error(
        `recalculateFantasyFromUserSeriesPointsForAllUsers failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
