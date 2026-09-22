import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UserMissingBetsRepository } from './user-missing-bets.repository';
import { User } from 'src/auth/user.entity';
import { SeriesService } from 'src/series/series.service';
import { UserMissingBet } from './user-missing-bets.entity';
import { AuthService } from 'src/auth/auth.service';
import { AppCacheService } from 'src/memory-cache/app-cache.service';
import {
  invalidateAfterGuessWrite,
  invalidateAfterMissingBetsRecalc,
} from 'src/memory-cache/cache-invalidation.util';

@Injectable()
export class UserMissingBetsService {
  private logger = new Logger('UserMissingBetsService', { timestamp: true });
  constructor(
    private userMissingBetsRepository: UserMissingBetsRepository,
    @Inject(forwardRef(() => SeriesService))
    private seriesService: SeriesService,
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    private readonly appCache: AppCacheService,
  ) {}

  async afterGuessWrite(user: Pick<User, 'id' | 'username'>): Promise<void> {
    this.logger.log(
      `Maintaining missing bets after guess write for user ${user.username}`,
    );
    await invalidateAfterGuessWrite(this.appCache, user.id);
    await this.updateMissingBetsForUser(user as User);
    this.logger.verbose(
      `Missing bets maintained after guess write for user ${user.username}`,
    );
  }

  async afterBetWrite(): Promise<void> {
    this.logger.log('Refreshing missing bets for all users after bet write');
    await this.updateMissingBetsToAllUsers();
  }
  async getMissingBetsForUser(user: User): Promise<{
    [seriesId: string]: {
      seriesName: string;
      gamesAndWinner: boolean;
      playerMatchup: any[];
      spontaneousBets: any[];
    };
  }> {
    const key = this.appCache.buildUserKey(
      user.id,
      'user-missing-bets/user',
      {},
    );
    return this.appCache.wrap(key, async () => {
      try {
        const missingBets = await this.userMissingBetsRepository.find({
          where: { user: { id: user.id } },
        });

        const result: {
          [seriesId: string]: {
            seriesName: string;
            gamesAndWinner: boolean;
            playerMatchup: any[];
            spontaneousBets: any[];
          };
        } = {};

        for (const bet of missingBets) {
          const { seriesId, betType, details } = bet;

          if (!result[seriesId]) {
            result[seriesId] = {
              seriesName: details.seriesName,
              gamesAndWinner: false,
              playerMatchup: [],
              spontaneousBets: [],
            };
          }

          switch (betType) {
            case 'bestOf7':
            case 'teamWin':
              result[seriesId].gamesAndWinner = true;
              break;
            case 'playerMatchup':
              result[seriesId].playerMatchup.push(details);
              break;
            case 'spontaneous':
              result[seriesId].spontaneousBets.push(details);
              break;
          }
        }

        return result;
      } catch (error) {
        this.logger.error(
          `Failed to get missing bets for user: "${user.username}" ${error.stack}`,
        );
        throw new InternalServerErrorException(
          `Failed to get missing bets for user: "${user.username}"`,
        );
      }
    });
  }

  async updateMissingBetsForUser(user: User): Promise<void> {
    try {
      await this.userMissingBetsRepository.delete({ user: { id: user.id } });

      const missingBets =
        await this.seriesService.computeOptimizedMissingBets(user);

      const entries: UserMissingBet[] = [];
      for (const [seriesId, data] of Object.entries(missingBets)) {
        const baseDetails = {
          seriesName: data.seriesName,
          team1: data.seriesName.split(' vs ')[0],
          team2: data.seriesName.split(' vs ')[1],
        };

        if (data.gamesAndWinner) {
          entries.push(
            this.userMissingBetsRepository.create({
              user: { id: user.id } as any,
              betType: 'bestOf7',
              betId: `bestOf7-${seriesId}`,
              seriesId,
              details: baseDetails,
            }),
          );
        }

        for (const bet of data.playerMatchup) {
          entries.push(
            this.userMissingBetsRepository.create({
              user: { id: user.id } as any,
              betType: 'playerMatchup',
              betId: bet.id,
              seriesId,
              details: {
                ...baseDetails,
                player1: bet.player1,
                player2: bet.player2,
                category: bet.categories?.[0],
                gameNumber: bet.gameNumber,
              },
            }),
          );
        }

        for (const bet of data.spontaneousBets) {
          entries.push(
            this.userMissingBetsRepository.create({
              user: { id: user.id } as any,
              betType: 'spontaneous',
              betId: bet.id,
              seriesId,
              details: {
                ...baseDetails,
                player1: bet.player1,
                player2: bet.player2,
                gameNumber: bet.gameNumber,
                startTime: bet.startTime,
              },
            }),
          );
        }
      }

      await this.userMissingBetsRepository.save(entries);
      this.logger.verbose(`User ${user.username} updated his missing bets.`);
      await this.appCache.delByPrefix(this.appCache.userPrefix(user.id));
    } catch (error) {
      this.logger.error(
        `Failed to update missing bets for user ${user.username}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not update user missing bets',
      );
    }
  }
  async updateMissingBetsToAllUsers(): Promise<void> {
    try {
      const users = await this.authService.getAllUserIds();
      for (const user of users) {
        await this.updateMissingBetsForUser({
          id: user.id,
          username: user.id,
        } as User);
      }
      this.logger.verbose(`Update all users missing bets`);
      await invalidateAfterMissingBetsRecalc(this.appCache);
    } catch (error) {
      this.logger.error(
        `Failed to update missing bets to all users`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not update users missing bets',
      );
    }
  }
}
