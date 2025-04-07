import { Controller, Get, Logger, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UserMissingBetsService } from './user-missing-bets.service';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';

@Controller('user-missing-bets')
@UseGuards(JwtAuthGuard)
export class UserMissingBetsController {
  private logger = new Logger('UserMissingBetsController', { timestamp: true });
  constructor(
    private readonly userMissingBetsService: UserMissingBetsService,
  ) {}

  @Get('/user')
  async getMissingBetsForUser(@GetUser() user: User) {
    return this.userMissingBetsService.getMissingBetsForUser(user);
  }

  @Patch('/user/updateBets')
  async updateMissingBetsForUser(@GetUser() user: User) {
    this.logger.verbose(
      `User ${user.username} attempting to update his missing bets`,
    );
    return await this.userMissingBetsService.updateMissingBetsForUser(user);
  }
  @Patch('/user/updateAllUsers')
  async updateMissingBetsToAllUsers(@GetUser() user: User): Promise<void> {
    this.logger.verbose(
      `User ${user.username} attempting to update missing bets to all users`,
    );
    return await this.userMissingBetsService.updateMissingBetsToAllUsers();
  }
}
