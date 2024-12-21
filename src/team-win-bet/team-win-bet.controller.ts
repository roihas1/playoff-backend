import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeamWinBetService } from './team-win-bet.service';
import { CreateTeamWinBetDto } from './dto/create-team-win-bet.dto';
import { TeamWinBet } from './team-win-bet.entity';
import { User } from '../auth/user.entity';
import { GetUser } from '../auth/get-user.decorator';

@Controller('team-win-bet')
@UseGuards(AuthGuard())
export class TeamWinBetController {
  private logger = new Logger('TeamWinBetController', { timestamp: true });
  constructor(private teamWinBetService: TeamWinBetService) {}

  @Post()
  async createTeamWinBet(
    @Body() createTeamWinBetDto: CreateTeamWinBetDto,
    @GetUser() user: User,
  ): Promise<TeamWinBet> {
    this.logger.verbose(
      `User "${user.username}" creating new TeamWinBet. Data: ${JSON.stringify(createTeamWinBetDto)}.`,
    );
    return await this.teamWinBetService.createTeamWinBet(createTeamWinBetDto);
  }
}
