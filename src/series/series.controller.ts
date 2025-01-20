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
import { SeriesService } from './series.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { Series } from './series.entity';
import { CreateSeriesDto } from './dto/create-series.dto';
import { GetSeriesWithFilterDto } from './dto/get-series-filter.dto';
import { CreateGuessesDto } from './dto/create-guesses.dto';
import { TeamWinGuess } from 'src/team-win-guess/team-win-guess.entity';
import { BestOf7Guess } from 'src/best-of7-guess/best-of7-guess.entity';
import { PlayerMatchupGuess } from 'src/player-matchup-guess/player-matchup-guess.entity';
import { UpdateResultTeamGamesDto } from './dto/update-team-games-result.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { BestOf7Bet } from 'src/best-of7-bet/bestOf7.entity';
import { TeamWinBet } from 'src/team-win-bet/team-win-bet.entity';
import { PlayerMatchupBet } from 'src/player-matchup-bet/player-matchup-bet.entity';
import { Conference } from './conference.enum';
import { Round } from './round.enum';

@Controller('series')
@UseGuards(JwtAuthGuard)
export class SeriesController {
  private logger = new Logger('SeriesController', { timestamp: true });
  constructor(private seriesServie: SeriesService) {}

  @Get()
  async getSeries(
    @Query() getSeriesFilterDto: GetSeriesWithFilterDto,
    @GetUser() user: User,
  ): Promise<Series[]> {
    this.logger.verbose(
      `User "${user.username}" attempting to retrieve all series.`,
    );
    return await this.seriesServie.getSeriesWithFilters(getSeriesFilterDto);
  }

  @Post()
  async createSeries(
    @Body() createSeriesDto: CreateSeriesDto,
    @GetUser() user: User,
  ): Promise<Series> {
    this.logger.verbose(
      `User "${user.username}" creating new series. Data: ${JSON.stringify(createSeriesDto)}.`,
    );
    return await this.seriesServie.createSeries(createSeriesDto); // todo: decide if I need to save the user to series.
  }

  @Get('/:id')
  async getSeriesByID(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<Series> {
    this.logger.verbose(
      `User "${user.username}" retrieving series with id: ${id}.`,
    );
    return await this.seriesServie.getSeriesByID(id);
  }
  @Get('/:id/score')
  async getSeriesScore(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<number[]> {
    this.logger.verbose(
      `User "${user.username}" retrieving series score with id: ${id}.`,
    );
    return await this.seriesServie.getSeriesScore(id);
  }

  @Delete('/:id')
  async deleteSeries(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User "${user.username}"attempt to delete series with id: ${id}.`,
    );
    return await this.seriesServie.deleteSeries(id);
  }
  @Post('/:seriesId/createGuesses')
  async createAllGuesses(
    @Param('seriesId') seriesId: string,
    @Body() createGuessesDto: CreateGuessesDto,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User "${user.username}"attempt to create series guesses with id: ${seriesId}.`,
    );
    await this.seriesServie.createAllGuesses(seriesId, createGuessesDto, user);
  }
  @Patch('/:seriesId/updateGuesses')
  async updateGuesses(
    @Param('seriesId') seriesId: string,
    @Body() updateGuessesDto: CreateGuessesDto,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User "${user.username}"attempt to update series guesses with id: ${seriesId}.`,
    );
    await this.seriesServie.updateGuesses(seriesId, updateGuessesDto, user);
  }
  @Get('/:seriesId/getGuesses')
  async getGuessesByUser(
    @Param('seriesId') seriesId: string,
    @GetUser() user: User,
  ): Promise<{
    teamWinGuess: TeamWinGuess;
    bestOf7Guess: BestOf7Guess;
    playerMatchupGuess: PlayerMatchupGuess[];
  }> {
    this.logger.verbose(
      `User "${user.username}" attempt to retrieve series guesses with id: ${seriesId}.`,
    );
    const guesses = await this.seriesServie.getGuessesByUser(seriesId, user);

    return guesses;
  }
  @Patch('/:seriesId/updateResult')
  async updateResultTeamGames(
    @Param('seriesId') seriesId: string,
    @Body() updateResultTeamGamesDto: UpdateResultTeamGamesDto,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User "${user.username}" attempt to update series team and games result. Series with id: ${seriesId}.`,
    );
    return await this.seriesServie.updateResultTeamGames(
      seriesId,
      updateResultTeamGamesDto,
      user,
    );
  }
  @Patch('/:seriesId/updateGame')
  async updateGameResult(
    @Param('seriesId') id: string,
    @Body() updateGame: UpdateGameDto,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to update bestOf7Bet game in series ID: "${id}".`,
    );
    return await this.seriesServie.updateGame(id, updateGame, user);
  }

  @Patch('/:seriesId/closeBets')
  async closeAllBetsInSeries(
    @Param('seriesId') seriesId: string,
    @GetUser() user: User,
  ): Promise<void> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to close all bets in series with ID: "${seriesId}".`,
    );
    return await this.seriesServie.closeAllBetsInSeries(seriesId, user);
  }
  @Get('/isUserGuessed/All')
  async checkIfUserGuessedAll(
    @GetUser() user: User,
  ): Promise<{ [key: string]: boolean }> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to check if he guessed all bets.`,
    );
    return await this.seriesServie.checkIfUserGuessedAll(user);
  }
  @Get('/:seriesId/getOverallPointsPerSeries')
  async getPointsForUser(
    @Param('seriesId') seriesId: string,
    @GetUser() user: User,
  ): Promise<number> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to get his points for series id:${seriesId}.`,
    );
    return await this.seriesServie.getPointsForUser(seriesId, user);
  }
  @Get('/getOverallPoints/allSeries')
  async getPointsPerSeriesForUser(
    @GetUser() user: User,
  ): Promise<{ [key: string]: number }> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to get his points for all series.`,
    );
    return await this.seriesServie.getPointsPerSeriesForUser(user);
  }
  @Get('/getAll/bets')
  async getAllBets(@GetUser() user: User): Promise<{
    [key: string]: {
      team1: string;
      team2: string;
      conference: Conference;
      round: Round;
      startDate: Date;
      bestOf7Bet: BestOf7Bet;
      teamWinBet: TeamWinBet;
      playerMatchupBets: PlayerMatchupBet[];
    };
  }> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to get all bets`,
    );
    return await this.seriesServie.getAllBets();
  }
}
