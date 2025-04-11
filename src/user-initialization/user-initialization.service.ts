import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { User } from 'src/auth/user.entity';
import { UserMissingBetsService } from 'src/user-missing-bets/user-missing-bets.service';
import { UserSeriesPointsService } from 'src/user-series-points/user-series-points.service';

@Injectable()
export class UserInitializationService {
  constructor(
    @Inject(forwardRef(() => UserSeriesPointsService))
    private userSeriesPointsService: UserSeriesPointsService,

    @Inject(forwardRef(() => UserMissingBetsService))
    private userMissingBetsService: UserMissingBetsService,
  ) {}

  async initializeUser(user: User) {
    await this.userSeriesPointsService.updatePointsForUser(user);
    await this.userMissingBetsService.updateMissingBetsForUser(user);
  }
}
