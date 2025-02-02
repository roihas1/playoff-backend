import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BestOf7BetService } from './best-of7-bet.service';
import { CreateBestOf7BetDto } from './dto/create-best-of7-bet.dto';
import { GetUser } from '../auth/get-user.decorator';
import { BestOf7Bet } from './bestOf7.entity';
import { User } from '../auth/user.entity';
import { UpdateResultDto } from './dto/update-result.dto';
import { UpdateFantasyPointsDto } from './dto/update-fantasy-points.dto';
import { UpdateGameDto } from '../series/dto/update-game.dto';
import { Roles } from 'src/auth/roles.decorator';
import { Role } from 'src/auth/user-role.enum';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('best-of7-bet')
@UseGuards(AuthGuard())
export class BestOf7BetController {
  private logger = new Logger('BestOf7BetController', { timestamp: true });
  constructor(private bestOf7BetService: BestOf7BetService) {}

  @Post()
  async createBestOf7Bet(
    @Body() createBestOf7Bet: CreateBestOf7BetDto,
    @GetUser() user: User,
  ): Promise<BestOf7Bet> {
    this.logger.verbose(
      `User "${user.username}" creating new BestOf7Bet. Data: ${JSON.stringify(createBestOf7Bet)}.`,
    );
    return await this.bestOf7BetService.createBestOf7Bet(createBestOf7Bet);
  }
  @Get('/:id')
  async getBestOf7BetById(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<BestOf7Bet> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to get bestOf7Bet with ID: "${id}".`,
    );

    return await this.bestOf7BetService.getBestOf7betById(id);
  }

  @Delete('/:id')
  async deleteBestOf7Bet(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to delete bestOf7Bet with ID: "${id}".`,
    );
    return await this.bestOf7BetService.deleteBestOf7Bet(id);
  }

  @Patch('/:id/result')
  async updateResult(
    @Param('id') id: string,
    @Body() updateResultDto: UpdateResultDto,
    @GetUser() user: User,
  ): Promise<BestOf7Bet> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to update bestOf7Bet result with ID: "${id}".`,
    );
    return await this.bestOf7BetService.updateResult(updateResultDto, id);
  }
  @Patch('/:id/updateFSP')
  async updateFantasyPoints(
    @Param('id') id: string,
    @Body() updateFantasyPointsDto: UpdateFantasyPointsDto,
    @GetUser() user: User,
  ): Promise<BestOf7Bet> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to update bestOf7Bet fantasy points with ID: "${id}".`,
    );
    return await this.bestOf7BetService.updateFantasyPoints(
      updateFantasyPointsDto,
      id,
    );
  }
  @Patch('/:id/updateGame')
  async updateGameResult(
    @Param('id') id: string,
    @Body() updateGame: UpdateGameDto,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to update bestOf7Bet game with ID: "${id}".`,
    );
    return await this.bestOf7BetService.updateGame(id, updateGame, user);
  }
}
