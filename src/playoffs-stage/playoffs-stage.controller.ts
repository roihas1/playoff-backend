import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlayoffsStageService } from './playoffs-stage.service';
import { GetUser } from 'src/auth/get-user.decorator';
import { PlayoffStage } from './playoffs-stage.entity';
import { User } from 'src/auth/user.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PlayoffsStage } from './playoffs-stage.enum';
import { CreatePlayoffsStageDto } from './dto/create-playoffs-stage.dto';
import { CloseGuessesDto } from './dto/close-guesses.dto';
import { ChampionTeamGuess } from 'src/champions-guess/entities/champion-team-guess.entity';
import { ConferenceFinalGuess } from 'src/champions-guess/entities/conference-final-guess.entity';
import { MVPGuess } from 'src/champions-guess/entities/mvp-guess.entity';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { Role } from 'src/auth/user-role.enum';
export interface PriorGuesses {
  conferenceFinalGuesses: {
    id: string;
    team1: string;
    team2: string;
    conference: string;
  }[];
  championTeamGuesses: { id: string; team: string }[];
  mvpGuesses: { id: string; player: string }[];
}

export interface PriorGuessesByStage {
  beforePlayoffs?: PriorGuesses;
  round1?: PriorGuesses;
  round2?: PriorGuesses;
}

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
    return await this.playoffsStageService.getAllPlayoffsStages();
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
  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async createPlayoffsStage(
    @Body() createPlayoffsStageDto: CreatePlayoffsStageDto,
    @GetUser() user: User,
  ): Promise<PlayoffStage> {
    this.logger.verbose(
      `User: ${user.username} attempt to create playoffs stage ${createPlayoffsStageDto.name}.`,
    );

    return await this.playoffsStageService.createPlayoffsStage(
      createPlayoffsStageDto,
      user,
    );
  }
  @Patch('/closeGuess')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async closeGuesses(
    @Body() closeGuessesDto: CloseGuessesDto,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User: ${user.username} attempt to close champions guesses`,
    );
    return await this.playoffsStageService.closeGuesses(closeGuessesDto);
  }

  @Get('/userGuesses/:stage')
  async getUserGuesses(
    @Param('stage') stage: PlayoffsStage,
    @GetUser() user: User,
  ): Promise<{
    conferenceFinalGuesses: ConferenceFinalGuess[];
    championTeamGuesses: ChampionTeamGuess[];
    mvpGuesses: MVPGuess[];
  }> {
    this.logger.verbose(
      `User: ${user.username} attempt to get his champions guesses`,
    );

    return await this.playoffsStageService.getUserGuesses(stage, user.id);
  }
  @Get('/getGuesses/:stage')
  async getPriorGuesses(
    @Param('stage') stage: PlayoffsStage,
    @GetUser() user: User,
  ): Promise<PriorGuesses | PriorGuessesByStage> {
    this.logger.verbose(
      `User: ${user.username} attempt to get his prior champions guesses`,
    );
    return await this.playoffsStageService.getPriorGuesses(stage, user);
  }
  @Get('/getUserGuesses/:stage/:userId')
  async getUserGuessesById(
    @Param('stage') stage: PlayoffsStage,
    @Param('userId') userId: string,
    @GetUser() user: User,
  ): Promise<{
    conferenceFinalGuesses: ConferenceFinalGuess[];
    championTeamGuesses: ChampionTeamGuess[];
    mvpGuesses: MVPGuess[];
  }> {
    this.logger.verbose(
      `User: ${user.username} attempt to get ${userId} champions guesses`,
    );
    return await this.playoffsStageService.getUserGuesses(stage, userId);
  }

  @Get('/passedStages')
  async getPassedStages(@GetUser() user: User): Promise<string[]> {
    this.logger.verbose(`User: ${user.username} attempt to get passed stages.`);
    return await this.playoffsStageService.getPassedStages();
  }
}
