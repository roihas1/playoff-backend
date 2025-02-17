import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrivateLeagueRepository } from './private-league.repository';
import { CreatePrivateLeagueDto } from './dto/CreatePrivateLeagueDto';
import { User } from 'src/auth/user.entity';
import { PrivateLeague } from './private-league.entity';
import { JoinLeagueDto } from './dto/join-league.dto';
import { NotFoundError } from 'rxjs';
import { AuthService } from 'src/auth/auth.service';
import { RemoveUsersDto } from './dto/remove-users.dto';

@Injectable()
export class PrivateLeagueService {
  private logger = new Logger('PrivateLeagueService', { timestamp: true });
  constructor(
    private privateLeagueRepo: PrivateLeagueRepository,
    private authService: AuthService,
  ) {}

  async createPrivateLeague(
    createPrivateLeagueDto: CreatePrivateLeagueDto,
    user: User,
  ): Promise<PrivateLeague> {
    try {
      const league = await this.privateLeagueRepo.create({
        name: createPrivateLeagueDto.name,
        users: [user],
        admin: user,
      });
      const savedLeague = await this.privateLeagueRepo.save(league);
      this.logger.verbose(`Private league created.`);
      return savedLeague;
    } catch (error) {
      this.logger.error(
        `Failed to create private league by: ${user} ${error.stack}`,
      );
      throw new InternalServerErrorException(
        `Failed to create private league by: ${user}`,
      );
    }
  }
  async joinLeague(
    joinLeagueDto: JoinLeagueDto,
    user: User,
  ): Promise<{ message: string; status: boolean }> {
    try {
      const league = await this.privateLeagueRepo.findOne({
        where: { code: joinLeagueDto.code },
        relations: ['users'],
      });

      if (!league) {
        this.logger.error(
          `League with code: ${joinLeagueDto.code} was not found.`,
        );
        throw new NotFoundException(
          `League with code: ${joinLeagueDto.code} was not found.`,
        );
      }

      const isUserInLeague = league.users.some((curr) => curr.id === user.id);
      if (isUserInLeague) {
        this.logger.warn(
          `User ${user.id} is already in the league ${league.name}`,
        );
        throw new ConflictException('User is already in the league');
      }

      league.users.push(user);
      await this.privateLeagueRepo.save(league);

      return {
        message: `User successfully joined the league ${league.name}`,
        status: true,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to join private league for user: ${user.id}`,
        error.stack,
      );
      throw new InternalServerErrorException(`Failed to join private league`);
    }
  }
  async getUserLeagues(user: User): Promise<PrivateLeague[]> {
    try {
      const leagues = await this.authService.getAllUserLeagues(user);
      return leagues;
    } catch (error) {
      this.logger.error(
        `Failed to get all private leagues for user: ${user.username}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to get all private leagues`,
      );
    }
  }
  async getAllUsersForLeague(leagueId: string): Promise<User[]> {
    try {
      const league = await this.privateLeagueRepo.findOne({
        where: { id: leagueId },
        relations: ['users'],
      });
      return league.users;
    } catch (error) {
      this.logger.error(
        `Failed to get all users for league:${leagueId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to get all users for league:${leagueId}`,
      );
    }
  }
  async updateLeagueName(leagueId: string, newName: string): Promise<void> {
    try {
      const league = await this.privateLeagueRepo.findOne({
        where: { id: leagueId },
      });
      if (!league) {
        this.logger.error(`League with id: ${leagueId} was not found.`);
        throw new NotFoundException(
          `League with id: ${leagueId} was not found.`,
        );
      }
      league.name = newName;
      await this.privateLeagueRepo.save(league);
    } catch (error) {
      this.logger.error(
        `Failed to update league name for league:${leagueId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update league name for league:${leagueId}`,
      );
    }
  }
  async deletePrivateLeague(leagueId: string): Promise<void> {
    try {
      const league = await this.privateLeagueRepo.findOne({
        where: { id: leagueId },
      });
      if (!league) {
        this.logger.error(`League with id: ${leagueId} was not found.`);
        throw new NotFoundException(
          `League with id: ${leagueId} was not found.`,
        );
      }
      await this.privateLeagueRepo.delete(league.id);
    } catch (error) {
      this.logger.error(
        `Failed to delete league for league:${leagueId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to delete league  for league:${leagueId}`,
      );
    }
  }
  async removeUsersFromLeague(
    removeUsersDto: RemoveUsersDto,
    leagueId: string,
  ): Promise<void> {
    try {
      const league = await this.privateLeagueRepo.findOne({
        where: { id: leagueId },
        relations: ['users'],
      });
      if (!league) {
        this.logger.error(`League with id: ${leagueId} was not found.`);
        throw new NotFoundException(
          `League with id: ${leagueId} was not found.`,
        );
      }
      const { users } = removeUsersDto;
      league.users = league.users.filter(
        (user) => !users.some((removeUser) => removeUser.id === user.id),
      );
      await this.privateLeagueRepo.save(league);
    } catch (error) {
      this.logger.error(
        `Failed to remove users from league:${leagueId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to remove users from league:${leagueId}`,
      );
    }
  }
  async userLeaveLeague(leagueId: string, removeUser: User): Promise<void> {
    try {
      const league = await this.privateLeagueRepo.findOne({
        where: { id: leagueId },
        relations: ['users'],
      });
      if (!league) {
        this.logger.error(`League with id: ${leagueId} was not found.`);
        throw new NotFoundException(
          `League with id: ${leagueId} was not found.`,
        );
      }
      league.users = league.users.filter((user) => user.id !== removeUser.id);
      await this.privateLeagueRepo.save(league);
    } catch (error) {
      this.logger.error(
        `User: ${removeUser.username} failed to leave league:${leagueId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `User: ${removeUser.username} failed to leave league:${leagueId}`,
      );
    }
  }
}
