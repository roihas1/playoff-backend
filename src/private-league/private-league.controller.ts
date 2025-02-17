import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PrivateLeagueService } from './private-league.service';
import { PrivateLeague } from './private-league.entity';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { CreatePrivateLeagueDto } from './dto/CreatePrivateLeagueDto';
import { JoinLeagueDto } from './dto/join-league.dto';
import { RemoveUsersDto } from './dto/remove-users.dto';

@Controller('private-league')
@UseGuards(JwtAuthGuard)
export class PrivateLeagueController {
  private logger = new Logger('PrivateLeagueController', {
    timestamp: true,
  });
  constructor(private privateLeagueService: PrivateLeagueService) {}

  @Post()
  async createPrivateLeague(
    @Body() createPrivateLeagueDto: CreatePrivateLeagueDto,
    @GetUser() user: User,
  ): Promise<PrivateLeague> {
    this.logger.verbose(
      `User: ${user.username} attempting to create new private league. ${createPrivateLeagueDto.name}`,
    );
    return await this.privateLeagueService.createPrivateLeague(
      createPrivateLeagueDto,
      user,
    );
  }
  @Post('/joinLeague')
  async joinLeague(
    @Body() joinLeagueDto: JoinLeagueDto,
    @GetUser() user: User,
  ): Promise<{ message: string; status: boolean }> {
    this.logger.verbose(
      `User: ${user.username} attempting to join  private league.`,
    );
    return await this.privateLeagueService.joinLeague(joinLeagueDto, user);
  }
  @Get()
  async getUserLeagues(@GetUser() user: User): Promise<PrivateLeague[]> {
    this.logger.verbose(
      `User: ${user.username} attempting to get all his private leagues.`,
    );
    return await this.privateLeagueService.getUserLeagues(user);
  }
  @Get('/:leagueId/users')
  async getAllUsersForLeague(
    @Param('leagueId') leagueId: string,
    @GetUser() user: User,
  ): Promise<User[]> {
    this.logger.verbose(
      `User: ${user.username} attempting to get all users league.`,
    );
    return await this.privateLeagueService.getAllUsersForLeague(leagueId);
  }

  @Patch('/:leagueId/:newName/updateName')
  async updateLeagueName(
    @Param('leagueId') leagueId: string,
    @Param('newName') newName: string,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User: ${user.username} attempting to change league name`,
    );
    return await this.privateLeagueService.updateLeagueName(leagueId, newName);
  }
  @Delete('/:leagueId')
  async deletePrivateLeague(
    @Param('leagueId') leagueId: string,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User: ${user.username} attempting to delete league: ${leagueId}`,
    );
    return await this.privateLeagueService.deletePrivateLeague(leagueId);
  }
  @Patch('/:leagueId/removeUsers')
  async removeUsersFromLeague(
    @Body() removeUsersDto: RemoveUsersDto,
    @Param('leagueId') leagueId: string,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User: ${user.username} attempting to remove users from: ${leagueId}`,
    );
    return await this.privateLeagueService.removeUsersFromLeague(
      removeUsersDto,
      leagueId,
    );
  }
  @Patch('/:leagueId/leaveLeague')
  async userLeaveLeague(
    @Param('leagueId') leagueId: string,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User: ${user.username} attempting to leave: ${leagueId}`,
    );
    return await this.privateLeagueService.userLeaveLeague(leagueId, user);
  }
}
