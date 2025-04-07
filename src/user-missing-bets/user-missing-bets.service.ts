import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UserMissingBetsRepository } from './user-missing-bets.repository';
import { User } from 'src/auth/user.entity';
import { SeriesService } from 'src/series/series.service';
import { UserMissingBet } from './user-missing-bets.entity';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class UserMissingBetsService {
  private logger = new Logger('UserMissingBetsService', { timestamp: true });
  constructor(
    private userMissingBetsRepository: UserMissingBetsRepository,
    private seriesService: SeriesService,
    private authService: AuthService,
  ) {}
  async getMissingBetsForUser(user: User): Promise<{
    [seriesId: string]: {
      seriesName: string;
      gamesAndWinner: boolean;
      playerMatchup: any[];
      spontaneousBets: any[];
    };
  }> {
    try {
      const missingBets = await this.userMissingBetsRepository.find({
        where: { user },
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
  }

  async updateMissingBetsForUser(user: User): Promise<void> {
    try {
      const missingBets =
        await this.seriesService.getOptimizedMissingBets(user);

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
      const users = await this.authService.getAllUsers();
      for (const user of users) {
        await this.updateMissingBetsForUser(user);
      }
      this.logger.verbose(`Update all users missing bets`);
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
