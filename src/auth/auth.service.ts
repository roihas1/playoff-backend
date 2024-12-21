import {
  Injectable,
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

@Injectable()
export class AuthService {
  private logger = new Logger('AuthService', { timestamp: true });
  constructor(
    private usersRepository: UsersRepository,
    private jwtService: JwtService,
  ) {}

  async signUp(authCredentialsDto: AuthCredentialsDto): Promise<void> {
    try {
      await this.usersRepository.createUser(authCredentialsDto);
      this.logger.verbose(
        `User "${authCredentialsDto.username}" signed up successfully.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sign up user "${authCredentialsDto.username}".`,
        error.stack,
      );
      throw error;
    }
  }
  async signIn(authCredentialsDto: LoginDto): Promise<{ accessToken: string }> {
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
    const accessToken = this.jwtService.sign(payload);

    // const expiresIn = this.configService.get<number>('EXPIRE_IN') || 360;
    this.logger.verbose(
      `User "${username}" signed in successfully and access token generated.`,
    );
    return { accessToken };
  }
  async logout(user: User): Promise<void> {
    try {
      const found = await this.usersRepository.findOne({
        where: { username: user.username },
      });
      found.isActive = false;
      await this.usersRepository.save(found);
      this.logger.verbose(`User "${user.username}" logout.`);
    } catch (error) {
      throw new NotFoundException(`User ${user.username} not found.`);
    }
  }
}
