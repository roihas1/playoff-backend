import {
  Body,
  Controller,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TeamWinBetService } from './team-win-bet.service';
import { CreateTeamWinBetDto } from './dto/create-team-win-bet.dto';
import { TeamWinBet } from './team-win-bet.entity';
import { User } from '../auth/user.entity';
import { GetUser } from '../auth/get-user.decorator';
import { UpdateResultDto } from './dto/update-result.dto';
import { UpdateFantasyPointsDto } from 'src/best-of7-bet/dto/update-fantasy-points.dto';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { Role } from 'src/auth/user-role.enum';

@Controller('team-win-bet')
@UseGuards(AuthGuard())
export class TeamWinBetController {
  private logger = new Logger('TeamWinBetController', { timestamp: true });
  constructor(private teamWinBetService: TeamWinBetService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async createTeamWinBet(
    @Body() createTeamWinBetDto: CreateTeamWinBetDto,
    @GetUser() user: User,
  ): Promise<TeamWinBet> {
    this.logger.verbose(
      `User "${user.username}" creating new TeamWinBet. Data: ${JSON.stringify(createTeamWinBetDto)}.`,
    );
    return await this.teamWinBetService.createTeamWinBet(createTeamWinBetDto);
  }
  @Patch('/:id/result')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async updateResult(
    @Param('id') id: string,
    @Body() updateResultDto: UpdateResultDto,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to update TeamWinBet result with ID: "${id}".`,
    );
    return await this.teamWinBetService.updateResult(updateResultDto, id);
  }
  @Patch('/:id/updateFSP')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async updateFantasyPoints(
    @Param('id') id: string,
    @Body() updateFantasyPointsDto: UpdateFantasyPointsDto,
    @GetUser() user: User,
  ): Promise<TeamWinBet> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to update team win bet fantasy points with ID: "${id}".`,
    );
    return await this.teamWinBetService.updateFantasyPoints(
      updateFantasyPointsDto,
      id,
    );
  }
}
