import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { TeamWinGuess } from './team-win-guess.entity';
import { CreateTeamWinGuessDto } from './dto/create-team-win-guess.dto';
import { TeamWinGuessService } from './team-win-guess.service';
import { UpdateGuessDto } from 'src/player-matchup-guess/dto/update-guess.dto';

@Controller('team-win-guess')
@UseGuards(AuthGuard())
export class TeamWinGuessController {
  private logger = new Logger('TeamWinGuessController', { timestamp: true });
  constructor(private teamWinGuessService: TeamWinGuessService) {}

  @Post()
  async createTeamWinGuess(
    @Body() createTeamWinGuessDto: CreateTeamWinGuessDto,
    @GetUser() user: User,
  ): Promise<TeamWinGuess> {
    this.logger.verbose(
      `User "${user.username}" creating new TeamWinGuess. Data: ${JSON.stringify(createTeamWinGuessDto)}.`,
    );
    return await this.teamWinGuessService.createTeamWinGuess(
      createTeamWinGuessDto,
      user,
    );
  }

  @Get('/:guessId')
  async getGuessById(
    @Param('guessId') id: string,
    @GetUser() user: User,
  ): Promise<TeamWinGuess> {
    this.logger.verbose(
      `User "${user.username}" try to retrieve TeamWinGuess with ID: ${id}.`,
    );
    return await this.teamWinGuessService.getGuessById(id);
  }
  @Patch('/:id')
  async updateGuess(
    @Param('id') id: string,
    @Body() updateGuessDto: UpdateGuessDto,
    @GetUser() user: User,
  ): Promise<TeamWinGuess> {
    this.logger.verbose(
      `User "${user.username}" attempt to update TeamWinGuess with ID: ${id}.`,
    );
    const newGuess = await this.teamWinGuessService.updateGuess(
      id,
      updateGuessDto,
    );
    this.logger.verbose(`Guess with ID "${id}" successfully updated.`);
    return newGuess;
  }
}
