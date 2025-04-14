import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { LoginDto } from './dto/login.dto';
import { GetUser } from './get-user.decorator';
import { User } from './user.entity';

import { Logger } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Role } from './user-role.enum';
import { LogoutCredentialsDto } from './dto/logout-credentials.dto';
import { PlayoffsStage } from 'src/playoffs-stage/playoffs-stage.enum';
import { GoogleAuthGuard } from './google-auth/google-auth.guard';
import { AppLogger } from 'src/logging/logger.service';
import { ConfigService } from '@nestjs/config';
import { BestOf7Guess } from 'src/best-of7-guess/best-of7-guess.entity';
import { TeamWinGuess } from 'src/team-win-guess/team-win-guess.entity';
import { PlayerMatchupGuess } from 'src/player-matchup-guess/player-matchup-guess.entity';
import { SpontaneousGuess } from 'src/spontaneous-guess/spontaneous-guess.entity';

@Controller('auth')
export class AuthController {
  private logger = new Logger('AuthController', { timestamp: true });

  constructor(
    private authService: AuthService,
    // private readonly logger: AppLogger, // Inject properly
  ) {}

  @Post('signup')
  async signUp(@Body() authCredentialsDto: AuthCredentialsDto): Promise<User> {
    this.logger.verbose(
      `User sign-up attempt with username: ${authCredentialsDto.username}`,
      'AuthController',
    );
    return await this.authService.signUp(authCredentialsDto);
  }

  @Post('/signin')
  async signIn(@Body() authCredentialsDto: LoginDto): Promise<{
    accessToken: string;
    expiresIn: number;
    userRole: Role;
    username: string;
  }> {
    this.logger.log(
      `User sign-in attempt with username: "${authCredentialsDto.username}"`,
      'AuthController',
    );
    return await this.authService.signIn(authCredentialsDto);
  }

  @Patch('/logout')
  // @UseGuards(JwtAuthGuard)
  async logout(@Body() credentials: LogoutCredentialsDto): Promise<void> {
    this.logger.verbose(
      `User loging out attempt with username: "${credentials.username}".`,
      'AuthController',
    );

    return await this.authService.logout(credentials.username);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @GetUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to update user with ID: "${user.id}".`,
      'AuthController',
    );
    return this.authService.updateUser(user.id, updateUserDto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteUser(@GetUser() user: User): Promise<void> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to delete user with ID: "${user.id}".`,
      'AuthController',
    );
    return await this.authService.deleteUser(user);
  }
  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllUsers(@GetUser() user: User): Promise<User[]> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to get all users.`,
      'AuthController',
    );
    return await this.authService.getAllUsers();
  }
  @Get('/search')
  @UseGuards(JwtAuthGuard)
  async searchUsers(
    @Query('query') query: string,
    @GetUser() user: User,
  ): Promise<User[]> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to serach users ${query}`,
      'AuthController',
    );
    return await this.authService.searchUsers(query);
  }

  @Get('/standings')
  @UseGuards(JwtAuthGuard)
  async getPaginatedUsers(
    @GetUser() user: User,
    @Query('cursorPoints') cursorPoints?: number,
    @Query('cursorId') cursorId?: string,
    @Query('prevCursorPoints') prevCursorPoints?: number,
    @Query('prevCursorId') prevCursorId?: string,
    @Query('limit') limit: number = 10,
    @Query('leagueId') leagueId?: string,
  ) {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to get paginated users with limit ${limit} and cursorId: ${cursorId}`,
      'AuthController',
    );

    return await this.authService.getUsersWithCursor(
      cursorPoints && cursorId
        ? { totalPoints: Number(cursorPoints), id: cursorId }
        : undefined,
      prevCursorPoints && prevCursorId
        ? { totalPoints: Number(prevCursorPoints), id: prevCursorId }
        : undefined,
      limit,
      leagueId,
    );
  }

  @Get('/user')
  @UseGuards(JwtAuthGuard)
  async getUser(@GetUser() user: User): Promise<User> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to get his user object`,
      'AuthController',
    );
    return user;
  }
  @Get('/checkChampionsGuess')
  @UseGuards(JwtAuthGuard)
  async checkIfGuessedForChampions(
    @Query('stage') stage: PlayoffsStage,
    @GetUser() user: User,
  ): Promise<boolean> {
    this.logger.verbose(
      `User: ${user.username} checking if he has guessed already.`,
      'AuthController',
    );
    const isGuess = await this.authService.checkIfGuessedForChampions(
      stage,
      user,
    );
    return isGuess;
  }
  @Get('/getUserGuesses')
  @UseGuards(JwtAuthGuard)
  async getUserGuesses(@GetUser() user: User): Promise<User> {
    this.logger.verbose(
      `User: ${user.username} is attempting get all guesses.`,
      'AuthController',
    );
    return await this.authService.getUserGuesses(user);
  }
  @Get('/:seriesId/getUserGuesses')
  @UseGuards(JwtAuthGuard)
  async getUserGuessesForSeries(
    @Param('seriesId') seriesId: string,
    @GetUser() user: User,
  ): Promise<{
    bestOf7Guess: BestOf7Guess;
    teamWinGuess: TeamWinGuess;
    playerMatchupGuesses: PlayerMatchupGuess[];
    spontaneousGuesses: SpontaneousGuess[];
  }> {
    this.logger.verbose(
      `User: ${user.username} is attempting get guesses per series.`,
      'AuthController',
    );
    return await this.authService.getUserGuessesForSeries(seriesId, user);
  }

  @Get('/google/login')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get('/google-callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req, @Res() res) {
    const configService = new ConfigService();
    const response = await this.authService.loginWithGoogleOauth(
      req.user.googleId,
    );
    res.redirect(
      `${configService.get<string>('FRONTEND_URL')}/redirect?token=${response.accessToken}&username=${response.username}&tokenExpiry=${response.expiresIn}&userRole=${response.userRole}`,
    );
  }
}
