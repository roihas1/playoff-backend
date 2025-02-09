import {
  Body,
  Controller,
  Delete,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PlayerMatchupBetService } from './player-matchup-bet.service';
import { CreatePlayerMatchupBetDto } from './dto/create-player-matchup-bet.dto';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { PlayerMatchupBet } from './player-matchup-bet.entity';
import { UpdateResultDto } from './dto/update-result.dto';
import { UpdateFieldsDto } from './dto/update-fields.dto';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { Role } from 'src/auth/user-role.enum';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('player-matchup-bet')
@UseGuards(JwtAuthGuard)
export class PlayerMatchupBetController {
  private logger = new Logger('PlayerMatchupBetController', {
    timestamp: true,
  });
  constructor(private playerMatchupBetService: PlayerMatchupBetService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async createPlayerMatchupBet(
    @Body() createPlayerMatchupBetDto: CreatePlayerMatchupBetDto,
    @GetUser() user: User,
  ): Promise<PlayerMatchupBet> {
    this.logger.verbose(
      `User "${user.username}" creating new Player Matchup bet. Data: ${JSON.stringify(createPlayerMatchupBetDto)}.`,
    );
    return await this.playerMatchupBetService.createPlayerMatchupBet(
      createPlayerMatchupBetDto,
    );
  }
  @Delete('/:id/delete')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async deleteBet(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to delete playerMatchUpBet result with ID: "${id}".`,
    );
    await this.playerMatchupBetService.deleteBet(id, user);
  }

  @Patch('/:id/result')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async updateResult(
    @Param('id') id: string,
    @Body() updateResultDto: UpdateResultDto,
    @GetUser() user: User,
  ): Promise<PlayerMatchupBet> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to update playerMatchUpBet result with ID: "${id}".`,
    );
    return await this.playerMatchupBetService.updateResult(updateResultDto, id);
  }

  @Patch('/:id/update')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  async updateFields(
    @Body() updateFieldsDto: UpdateFieldsDto,
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<PlayerMatchupBet> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to update playerMatchUpBet fields with ID: "${id}". Data: ${JSON.stringify(updateFieldsDto)}`,
    );
    return await this.playerMatchupBetService.updateFields(updateFieldsDto, id);
  }
}
