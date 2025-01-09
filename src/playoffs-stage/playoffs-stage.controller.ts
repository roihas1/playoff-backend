import { Controller, Get, Logger, Param, Query, UseGuards } from '@nestjs/common';
import { PlayoffsStageService } from './playoffs-stage.service';
import { GetUser } from 'src/auth/get-user.decorator';
import { PlayoffStage } from './playoffs-stage.entity';
import { User } from 'src/auth/user.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PlayoffsStage } from './playoffs-stage.enum';

@Controller('playoffs-stage')
@UseGuards(JwtAuthGuard)
export class PlayoffsStageController {
  private logger = new Logger('PlayoffsStageController', { timestamp: true });
  constructor(private playoffsStageService: PlayoffsStageService) {}

  @Get()
  async getAllPlayoffsStages(@GetUser() user: User): Promise<PlayoffStage[]> {
    this.logger.verbose(
      `User: ${user.username} attempt to get all the playoffs stages.`,
    );
    return await this.playoffsStageService.getAllPlayoffsStages(user);
  }
  @Get('/checkGuess')
  async checkGuess(
    @Query('stage') stage: PlayoffsStage,
    @GetUser() user: User,
  ): Promise<boolean> {
    this.logger.verbose(
      `User: ${user.username} checking if he has guessed already.`,
    );
    const check = await this.playoffsStageService.checkGuess(stage, user);
    return !check;
  }
}
