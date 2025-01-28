import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';

import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './jwt-payload.interface';
import { User } from './user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConfigService } from '@nestjs/config';
import { Role } from './user-role.enum';
import { PlayoffsStage } from 'src/playoffs-stage/playoffs-stage.enum';
import { classToPlain, instanceToPlain } from 'class-transformer';

@Injectable()
export class AuthService {
  private logger = new Logger('AuthService', { timestamp: true });
  constructor(
    private usersRepository: UsersRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signUp(authCredentialsDto: AuthCredentialsDto): Promise<User> {
    try {
      const user = await this.usersRepository.createUser(authCredentialsDto);
      this.logger.verbose(
        `User "${authCredentialsDto.username}" signed up successfully.`,
      );
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to sign up user "${authCredentialsDto.username}".`,
        error.stack,
      );
      throw error;
    }
  }
  async signIn(authCredentialsDto: LoginDto): Promise<{
    accessToken: string;
    expiresIn: number;
    userRole: Role;
    username: string;
  }> {
    const { username, password } = authCredentialsDto;

    const user = await this.usersRepository.findOne({ where: { username } });

    if (!user) {
      this.logger.error(`User "${username}" not found.`);
      throw new NotFoundException(`User "${username}" not found.`);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(
        `Sign-in failed for user "${username}" due to incorrect credentials.`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }
    user.isActive = true;
    await this.usersRepository.save(user);

    const payload: JwtPayload = { username };
    const expiresIn = this.configService.get<number>('EXPIRE_IN') || 3600;
    const accessToken = this.jwtService.sign(payload);

    this.logger.verbose(
      `User "${username}" signed in successfully and access token generated.`,
    );
    return { accessToken, expiresIn, userRole: user.role, username };
  }
  async logout(username: string): Promise<void> {
    try {
      const found = await this.usersRepository.findOne({
        where: { username: username },
      });
      found.isActive = false;
      await this.usersRepository.save(found);
      this.logger.verbose(`User "${username}" logout.`);
    } catch (error) {
      throw new NotFoundException(`User ${username} not found.`);
    }
  }
  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      this.logger.error(`User with ID ${id} not found`);
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Update fields dynamically
    Object.assign(user, updateUserDto);
    this.logger.verbose(`User with ID: "${id}" successfully updated.`);
    return this.usersRepository.save(user);
  }

  async deleteUser(user: User): Promise<void> {
    const found = await this.usersRepository.findOne({
      where: { id: user.id },
    });

    if (!found) {
      this.logger.error(`User with ID ${user.id} not found`);
      throw new NotFoundException(`User with ID ${user.id} not found`);
    }
    try {
      await this.usersRepository.delete(found);
      this.logger.verbose(`User with ID "${user.id}" successfully deleted.`);
    } catch (error) {
      this.logger.error(
        `Failed to delete user with ID: "${user.id}".`,
        error.stack,
      );
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const users = await this.usersRepository.find();
      this.logger.verbose(`All users retrieved successfully.`);
      return users;
    } catch (error) {
      this.logger.error(`Failed to get all users.`, error.stack);
      throw error;
    }
  }
  async updateFantasyPoints(user: User, points: number): Promise<void> {
    try {
      user.fantasyPoints = user.fantasyPoints + points;
      await this.usersRepository.save(user);
      this.logger.verbose(
        `User: ${user.username} points were updated. added (${points})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update fantasy points to user:${user.username}`,
        error.stack,
      );
      throw error;
    }
  }

  /// Unfinished function, need to see if neccessary
  async checkIfGuessedForChampions(
    stage: PlayoffsStage,
    user: User,
  ): Promise<boolean> {
    try {
      const foundUser = await this.usersRepository.getChampionsGuesses(user.id);
      console.log(foundUser);

      return true;
    } catch (error) {
      this.logger.error(error);
    }
  }
  async getUserGuesses(user: User): Promise<User> {
    try {
      const foundUser = await this.usersRepository.findOne({
        where: { id: user.id },
        relations: ['bestOf7Guesses', 'teamWinGuesses', 'playerMatchupGuesses'],
      });
      return foundUser;
    } catch (error) {
      this.logger.error(
        `Failed to get guesses of user:${user.username}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to get guesses of user:${user.username}`,
      );
    }
  }
  async validateGoogleUser(googleUser: AuthCredentialsDto): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { email: googleUser.email },
    });
    if (user) return user;
    return await this.signUp(googleUser);
  }
}
