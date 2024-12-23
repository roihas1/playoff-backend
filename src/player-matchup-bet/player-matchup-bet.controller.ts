import {
  Body,
  Controller,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PlayerMatchupBetService } from './player-matchup-bet.service';
import { AuthGuard } from '@nestjs/passport';
import { CreatePlayerMatchupBetDto } from './dto/create-player-matchup-bet.dto';
import { GetUser } from 'src/auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { PlayerMatchupBet } from './player-matchup-bet.entity';
import { BestOf7Bet } from 'src/best-of7-bet/bestOf7.entity';
import { UpdateResultDto } from 'src/best-of7-bet/dto/update-result.dto';
import { UpdateFieldsDto } from './dto/update-fields.dto';

@Controller('player-matchup-bet')
@UseGuards(AuthGuard())
export class PlayerMatchupBetController {
  private logger = new Logger('PlayerMatchupBetController', {
    timestamp: true,
  });
  constructor(private playerMatchupBetService: PlayerMatchupBetService) {}

  @Post()
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

  @Patch('/:id/result')
  async updateResult(
    @Param('id') id: string,
    @Body() updateResultDto: UpdateResultDto,
    @GetUser() user: User,
  ): Promise<BestOf7Bet> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to update bestOf7Bet with ID: "${id}".`,
    );
    return await this.playerMatchupBetService.updateResult(updateResultDto, id);
  }

  @Patch('/:id/update')
  async updateFields(
    @Body() updateFieldsDto: UpdateFieldsDto,
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<PlayerMatchupBet> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to update bestOf7Bet fields with ID: "${id}". Data: ${JSON.stringify(updateFieldsDto)}`,
    );
    return await this.playerMatchupBetService.updateFields(updateFieldsDto, id);
  }
}
