import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivateLeagueRepository } from './private-league.repository';
import { CreatePrivateLeagueDto } from './dto/CreatePrivateLeagueDto';
import { User } from 'src/auth/user.entity';
import { PrivateLeague } from './private-league.entity';
import { JoinLeagueDto } from './dto/join-league.dto';
import { AuthService } from 'src/auth/auth.service';
import { RemoveUsersDto } from './dto/remove-users.dto';
import { LEGACY_MIGRATION_TOURNAMENT_ID } from 'src/tournament/legacy-migration-tournament.constants';
import { Tournament } from 'src/tournament/tournament.entity';
import { Role } from 'src/auth/user-role.enum';
import { LeagueMessage } from './league-message.entity';
import { LeagueMessageDto } from './dto/league-message.dto';
import { CreateLeagueMessageDto } from './dto/create-league-message.dto';
import { GetLeagueMessagesQueryDto } from './dto/get-league-messages-query.dto';
import { GetLeagueMessagesResponseDto } from './dto/get-league-messages-response.dto';

@Injectable()
export class PrivateLeagueService {
  private logger = new Logger('PrivateLeagueService', { timestamp: true });
  private static readonly MESSAGE_COOLDOWN_MS = 2_000;
  private static readonly DEFAULT_MESSAGES_LIMIT = 30;
  private static readonly MAX_MESSAGES_LIMIT = 50;

  constructor(
    private privateLeagueRepo: PrivateLeagueRepository,
    private authService: AuthService,
    @InjectRepository(Tournament)
    private tournamentRepo: Repository<Tournament>,
    @InjectRepository(LeagueMessage)
    private leagueMessageRepo: Repository<LeagueMessage>,
  ) {}

  private async loadLeagueWithMembers(
    leagueId: string,
  ): Promise<PrivateLeague | null> {
    return this.privateLeagueRepo.findOne({
      where: { id: leagueId },
      relations: ['users', 'admin', 'tournament'],
    });
  }

  private assertMemberOrAppAdmin(user: User, league: PrivateLeague): void {
    if (user.role === Role.ADMIN) {
      return;
    }
    const isMember = league.users?.some((u) => u.id === user.id);
    if (!isMember) {
      throw new ForbiddenException('You do not have access to this league.');
    }
  }

  private assertLeagueAdminOrAppAdmin(user: User, league: PrivateLeague): void {
    if (user.role === Role.ADMIN) {
      return;
    }
    if (league.admin?.id !== user.id) {
      throw new ForbiddenException(
        'Only the league admin can perform this action.',
      );
    }
  }

  private toLeagueMessageDto(message: LeagueMessage): LeagueMessageDto {
    if (!message.createdAt) {
      throw new InternalServerErrorException(
        'Message is missing a creation timestamp.',
      );
    }
    const firstName = message.author?.firstName?.trim();
    const lastName = message.author?.lastName?.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    return {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      authorName: fullName || message.author?.username || 'Unknown user',
    };
  }

  private parseCursor(cursor: string): { createdAt: Date; id: string } {
    const separatorIndex = cursor.indexOf('|');
    if (separatorIndex <= 0 || separatorIndex === cursor.length - 1) {
      throw new BadRequestException('Malformed cursor.');
    }

    const createdAtPart = cursor.slice(0, separatorIndex);
    const idPart = cursor.slice(separatorIndex + 1);
    const createdAt = new Date(createdAtPart);

    if (!idPart || Number.isNaN(createdAt.getTime())) {
      throw new BadRequestException('Malformed cursor.');
    }

    return { createdAt, id: idPart };
  }

  private encodeCursor(message: LeagueMessageDto): string {
    return `${message.createdAt}|${message.id}`;
  }

  async getLeagueMessages(
    leagueId: string,
    user: User,
    query: GetLeagueMessagesQueryDto,
  ): Promise<GetLeagueMessagesResponseDto> {
    try {
      const league = await this.loadLeagueWithMembers(leagueId);
      if (!league) {
        throw new NotFoundException(`League with id: ${leagueId} was not found.`);
      }

      this.assertMemberOrAppAdmin(user, league);

      const rawLimit = query.limit ?? PrivateLeagueService.DEFAULT_MESSAGES_LIMIT;
      const limit = Math.min(
        Math.max(rawLimit, 1),
        PrivateLeagueService.MAX_MESSAGES_LIMIT,
      );

      const qb = this.leagueMessageRepo
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.author', 'author')
        .leftJoin('message.league', 'league')
        .where('league.id = :leagueId', { leagueId });

      if (query.before) {
        const cursor = this.parseCursor(query.before);
        qb.andWhere(
          '(message.createdAt < :cursorCreatedAt OR (message.createdAt = :cursorCreatedAt AND message.id < :cursorId))',
          {
            cursorCreatedAt: cursor.createdAt.toISOString(),
            cursorId: cursor.id,
          },
        );
      } else if (query.after) {
        const cursor = this.parseCursor(query.after);
        qb.andWhere(
          '(message.createdAt > :cursorCreatedAt OR (message.createdAt = :cursorCreatedAt AND message.id > :cursorId))',
          {
            cursorCreatedAt: cursor.createdAt.toISOString(),
            cursorId: cursor.id,
          },
        );
      }

      qb.orderBy('message.createdAt', 'DESC')
        .addOrderBy('message.id', 'DESC')
        .take(limit + 1);

      const dbMessages = await qb.getMany();
      const hasMore = dbMessages.length > limit;
      const pageMessages = hasMore ? dbMessages.slice(0, limit) : dbMessages;

      const data = pageMessages
        .map((message) => this.toLeagueMessageDto(message))
        .reverse();
      const oldestMessage = data[0];

      return {
        data,
        pageInfo: {
          nextCursor: oldestMessage ? this.encodeCursor(oldestMessage) : null,
          hasMore,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to get messages for league:${leagueId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to get messages for league:${leagueId}`,
      );
    }
  }

  async createLeagueMessage(
    leagueId: string,
    user: User,
    createLeagueMessageDto: CreateLeagueMessageDto,
  ): Promise<{ data: LeagueMessageDto }> {
    try {
      const league = await this.loadLeagueWithMembers(leagueId);
      if (!league) {
        throw new NotFoundException(`League with id: ${leagueId} was not found.`);
      }

      this.assertMemberOrAppAdmin(user, league);

      const latestUserMessage = await this.leagueMessageRepo.findOne({
        where: {
          league: { id: leagueId },
          author: { id: user.id },
        },
        order: { createdAt: 'DESC' },
      });

      if (latestUserMessage) {
        const elapsedMs =
          Date.now() - new Date(latestUserMessage.createdAt).getTime();
        if (elapsedMs < PrivateLeagueService.MESSAGE_COOLDOWN_MS) {
          this.logger.warn(
            `Message cooldown hit for user:${user.id} league:${leagueId} elapsedMs:${elapsedMs}`,
          );
          throw new HttpException(
            'Please wait a moment before posting another message.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }

      const message = this.leagueMessageRepo.create({
        content: createLeagueMessageDto.content.trim(),
        league: { id: leagueId },
        author: { id: user.id },
      });

      const savedMessage = await this.leagueMessageRepo.save(message);
      const populatedMessage = await this.leagueMessageRepo.findOne({
        where: { id: savedMessage.id },
        relations: ['author'],
      });

      if (!populatedMessage) {
        throw new InternalServerErrorException('Failed to load created message.');
      }

      return {
        data: this.toLeagueMessageDto(populatedMessage),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        (error instanceof HttpException &&
          error.getStatus() === HttpStatus.TOO_MANY_REQUESTS)
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to create message for league:${leagueId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to create message for league:${leagueId}`,
      );
    }
  }

  async createPrivateLeague(
    createPrivateLeagueDto: CreatePrivateLeagueDto,
    user: User,
  ): Promise<PrivateLeague> {
    try {
      const tournamentId =
        createPrivateLeagueDto.tournamentId ?? LEGACY_MIGRATION_TOURNAMENT_ID;
      const tournamentExists = await this.tournamentRepo.exist({
        where: { id: tournamentId },
      });
      if (!tournamentExists) {
        throw new NotFoundException(
          `Tournament with id: ${tournamentId} was not found.`,
        );
      }
      const league = await this.privateLeagueRepo.create({
        name: createPrivateLeagueDto.name,
        users: [user],
        admin: user,
        tournament: { id: tournamentId },
      });
      const savedLeague = await this.privateLeagueRepo.save(league);
      this.logger.verbose(`Private league created.`);
      return savedLeague;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
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
  async getUserLeagues(
    user: User,
    tournamentId?: string,
  ): Promise<PrivateLeague[]> {
    try {
      const leagues = await this.authService.getAllUserLeagues(
        user,
        tournamentId,
      );
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
  async getAllUsersForLeague(
    leagueId: string,
    user: User,
    tournamentId?: string,
  ): Promise<
    {
      id: string;
      username: string;
      firstName: string;
      lastName: string;
      fantasyPoints: number;
      championPoints: number;
    }[]
  > {
    try {
      const leagueEntity = await this.loadLeagueWithMembers(leagueId);
      if (!leagueEntity) {
        this.logger.error(`League with id: ${leagueId} was not found.`);
        throw new NotFoundException(
          `League with id: ${leagueId} was not found.`,
        );
      }
      this.assertMemberOrAppAdmin(user, leagueEntity);
      let tid: string;
      if (tournamentId) {
        if (tournamentId !== leagueEntity.tournament.id) {
          throw new BadRequestException(
            'tournamentId does not match this league.',
          );
        }
        tid = tournamentId;
      } else {
        tid = leagueEntity.tournament.id;
      }
      const rawUsers = await this.privateLeagueRepo
        .createQueryBuilder('league')
        .leftJoin('league.users', 'user')
        .leftJoin(
          'user.tournamentPoints',
          'utp',
          'utp.tournamentId = :tournamentId',
          { tournamentId: tid },
        )
        .select('user.id', 'id')
        .addSelect('user.username', 'username')
        .addSelect('user.firstName', 'firstName')
        .addSelect('user.lastName', 'lastName')
        .addSelect('COALESCE(utp.fantasyPoints, 0)', 'scopedFantasy')
        .addSelect('COALESCE(utp.championPoints, 0)', 'scopedChampion')
        .where('league.id = :leagueId', { leagueId })
        .getRawMany();

      const users = rawUsers.map((raw) => ({
        id: raw.id,
        username: raw.username,
        firstName: raw.firstName,
        lastName: raw.lastName,
        fantasyPoints: Number(raw.scopedFantasy ?? raw.scopedfantasy ?? 0),
        championPoints: Number(raw.scopedChampion ?? raw.scopedchampion ?? 0),
      }));

      return users;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to get all users for league:${leagueId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to get all users for league:${leagueId}`,
      );
    }
  }

  async updateLeagueName(
    leagueId: string,
    newName: string,
    user: User,
  ): Promise<void> {
    try {
      const league = await this.loadLeagueWithMembers(leagueId);
      if (!league) {
        this.logger.error(`League with id: ${leagueId} was not found.`);
        throw new NotFoundException(
          `League with id: ${leagueId} was not found.`,
        );
      }
      this.assertLeagueAdminOrAppAdmin(user, league);
      league.name = newName;
      await this.privateLeagueRepo.save(league);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to update league name for league:${leagueId}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update league name for league:${leagueId}`,
      );
    }
  }
  async deletePrivateLeague(leagueId: string, user: User): Promise<void> {
    try {
      const league = await this.loadLeagueWithMembers(leagueId);
      if (!league) {
        this.logger.error(`League with id: ${leagueId} was not found.`);
        throw new NotFoundException(
          `League with id: ${leagueId} was not found.`,
        );
      }
      this.assertLeagueAdminOrAppAdmin(user, league);
      await this.privateLeagueRepo.delete(league.id);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
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
    user: User,
  ): Promise<void> {
    try {
      const league = await this.loadLeagueWithMembers(leagueId);
      if (!league) {
        this.logger.error(`League with id: ${leagueId} was not found.`);
        throw new NotFoundException(
          `League with id: ${leagueId} was not found.`,
        );
      }
      this.assertLeagueAdminOrAppAdmin(user, league);
      const { users } = removeUsersDto;
      league.users = league.users.filter(
        (user) => !users.some((removeUser) => removeUser.id === user.id),
      );
      await this.privateLeagueRepo.save(league);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
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
