import {
  Body,
  Controller,
  Delete,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { LoginDto } from './dto/login.dto';
import { GetUser } from './get-user.decorator';
import { User } from './user.entity';
import { AuthGuard } from '@nestjs/passport';
import { Logger } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('auth')
export class AuthController {
  private logger = new Logger('AuthController', { timestamp: true });
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() authCredentialsDto: AuthCredentialsDto): Promise<void> {
    this.logger.verbose(
      `User sign-up attempt with username: ${authCredentialsDto.username}`,
    );
    return await this.authService.signUp(authCredentialsDto);
  }

  @Post('/signin')
  async signIn(
    @Body() authCredentialsDto: LoginDto,
  ): Promise<{ accessToken: string }> {
    this.logger.verbose(
      `User sign-in attempt with username: "${authCredentialsDto.username}"`,
    );
    return await this.authService.signIn(authCredentialsDto);
  }

  @Patch('/logout')
  @UseGuards(AuthGuard())
  async logout(@GetUser() user: User): Promise<void> {
    this.logger.verbose(
      `User loging out attempt with username: "${user.username}".`,
    );
    return await this.authService.logout(user);
  }
  @Patch()
  @UseGuards(AuthGuard())
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
  async delteUser(@GetUser() user: User): Promise<void> {
    this.logger.verbose(
      `User with username: "${user.username}" is attempting to delete user with ID: "${user.id}".`,
    );
    return await this.authService.deleteUser(user);
  }
}
