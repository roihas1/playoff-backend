import {
  Body,
  Controller,
  Delete,
  Get,
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

@Controller('auth')
export class AuthController {
  private logger = new Logger('AuthController', { timestamp: true });
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() authCredentialsDto: AuthCredentialsDto): Promise<User> {
    this.logger.verbose(
      `User sign-up attempt with username: ${authCredentialsDto.username}`,
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
    this.logger.verbose(
      `User sign-in attempt with username: "${authCredentialsDto.username}"`,
    );
    return await this.authService.signIn(authCredentialsDto);
  }

  @Patch('/logout')
  // @UseGuards(JwtAuthGuard)
  async logout(@Body() credentials: LogoutCredentialsDto): Promise<void> {
    this.logger.verbose(
      `User loging out attempt with username: "${credentials.username}".`,
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
    );
    return this.authService.updateUser(user.id, updateUserDto);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteUser(@GetUser() user: User): Promise<void> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to delete user with ID: "${user.id}".`,
    );
    return await this.authService.deleteUser(user);
  }
  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllUsers(@GetUser() user: User): Promise<User[]> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to get all users.`,
    );
    return await this.authService.getAllUsers();
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
    );
    return await this.authService.getUsersWithCursor(
      cursorPoints && cursorId
        ? { points: Number(cursorPoints), id: cursorId }
        : undefined,
      prevCursorPoints && prevCursorId
        ? { points: Number(prevCursorPoints), id: prevCursorId }
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
    );
    return await this.authService.getUserGuesses(user);
  }

  @Get('/google/login')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get('/google-callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req, @Res() res) {
    console.log(req.user);
    const response = await this.authService.loginWithGoogleOauth(
      req.user.googleId,
    );
    res.redirect(
      `http://localhost:5173/redirect?token=${response.accessToken}&username=${response.username}&tokenExpiry=${response.expiresIn}&userRole=${response.userRole}`,
    );
  }
}
