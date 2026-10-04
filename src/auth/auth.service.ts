import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersRepository } from './users.repository';
import { PrivateLeague } from 'src/private-league/private-league.entity';
import { Tournament } from 'src/tournament/tournament.entity';
import { HomeStandingsPreviewDto } from './dto/home-standings-preview.dto';

import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './jwt-payload.interface';
import { User } from './user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MyProfileDto } from './dto/my-profile.dto';
import { UpdateMyProfileResponseDto } from './dto/update-my-profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConfigService } from '@nestjs/config';
import { Role } from './user-role.enum';
import { PlayoffsStage } from 'src/playoffs-stage/playoffs-stage.enum';
import { SpontaneousGuess } from 'src/spontaneous-guess/spontaneous-guess.entity';
import { BestOf7Guess } from 'src/best-of7-guess/best-of7-guess.entity';
import { PlayerMatchupGuess } from 'src/player-matchup-guess/player-matchup-guess.entity';
import { TeamWinGuess } from 'src/team-win-guess/team-win-guess.entity';
import { UserInitializationService } from 'src/user-initialization/user-initialization.service';
import { LEGACY_MIGRATION_TOURNAMENT_ID } from 'src/tournament/legacy-migration-tournament.constants';
import { AppCacheService } from 'src/memory-cache/app-cache.service';
import {
  invalidateAfterAuthProfileChange,
  invalidateAfterUserDeletion,
} from 'src/memory-cache/cache-invalidation.util';
import { SeriesService } from 'src/series/series.service';

@Injectable()
export class AuthService {
  private logger = new Logger('AuthService', { timestamp: true });
  constructor(
    private usersRepository: UsersRepository,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly userInitializationService: UserInitializationService,
    private readonly appCache: AppCacheService,
    @InjectRepository(PrivateLeague)
    private readonly privateLeagueRepo: Repository<PrivateLeague>,
    @InjectRepository(Tournament)
    private readonly tournamentRepo: Repository<Tournament>,
    @Inject(forwardRef(() => SeriesService))
    private readonly seriesService: SeriesService,
  ) {}

  async signUp(authCredentialsDto: AuthCredentialsDto): Promise<User> {
    try {
      const user = await this.usersRepository.createUser(authCredentialsDto);
      this.logger.verbose(
        `User "${authCredentialsDto.username}" signed up successfully.`,
      );
      await this.userInitializationService.initializeUser(user);
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to sign up user "${authCredentialsDto.username}".`,
        error.stack,
      );
      throw error;
    }
  }
  async loginWithGoogleOauth(googleId: string): Promise<{
    accessToken: string;
    expiresIn: number;
    userRole: Role;
    username: string;
  }> {
    try {
      const user = await this.usersRepository.findOne({ where: { googleId } });
      if (!user) {
        this.logger.error(`User with google id"${googleId}" not found.`);
        throw new NotFoundException(
          `User with google id"${googleId}" not found.`,
        );
      }
      user.isActive = true;
      await this.usersRepository.save(user);
      const expiresIn = this.configService.get<number>('EXPIRE_IN') || 3600;
      const accessToken = this.signAccessToken(user);

      this.logger.verbose(
        `User "${user.username}" signed in successfully and access token generated.`,
      );
      return {
        accessToken,
        expiresIn,
        userRole: user.role,
        username: user.username,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed Google OAuth sign-in for googleId "${googleId}".`,
        error instanceof Error ? error.stack : String(error),
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
      this.logger.warn(
        `Sign-in failed for user "${username}" due to invalid credentials.`,
      );
      throw new UnauthorizedException('Invalid credentials');
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

    const expiresIn = this.configService.get<number>('EXPIRE_IN') || 3600;
    const accessToken = this.signAccessToken(user);
    this.logger.verbose(
      `User "${username}" signed in successfully and access token generated.`,
    );
    return { accessToken, expiresIn, userRole: user.role, username };
  }

  private signAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    return this.jwtService.sign(payload);
  }
  async logout(user: User): Promise<void> {
    const found = await this.usersRepository.findOne({
      where: { id: user.id },
    });
    if (!found) {
      throw new NotFoundException(`User with id ${user.id} not found.`);
    }
    found.isActive = false;
    await this.usersRepository.save(found);
    this.logger.verbose(`User "${found.username}" logout.`);
  }

  async isUsernameAvailable(
    userId: string,
    username: string,
  ): Promise<boolean> {
    const normalized = username?.trim();
    if (!normalized || normalized.length < 4 || normalized.length > 12) {
      return false;
    }
    const existing = await this.usersRepository.findOne({
      where: { username: normalized },
      select: ['id'],
    });
    return !existing || existing.id === userId;
  }

  async getMyProfile(userId: string): Promise<MyProfileDto> {
    this.logger.log(`Fetching profile for user id "${userId}".`);
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        select: [
          'id',
          'username',
          'firstName',
          'lastName',
          'email',
          'role',
          'password',
          'googleId',
        ],
      });
      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found.`);
      }
      const profile = this.toMyProfileDto(user);
      this.logger.verbose(
        `Profile fetched for user "${profile.username}" (id: ${userId}).`,
      );
      return profile;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to fetch profile for user id "${userId}".`,
        error.stack,
      );
      throw error;
    }
  }

  async updateMyProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UpdateMyProfileResponseDto> {
    this.logger.log(
      `Profile update requested for user id "${userId}" (fields: ${Object.keys(dto).join(', ') || 'none'}).`,
    );
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        select: [
          'id',
          'username',
          'firstName',
          'lastName',
          'email',
          'role',
          'password',
          'googleId',
        ],
      });
      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found.`);
      }

      const jwtFieldsChanged =
        (dto.username !== undefined && dto.username !== user.username) ||
        (dto.firstName !== undefined && dto.firstName !== user.firstName) ||
        (dto.lastName !== undefined && dto.lastName !== user.lastName);

      if (dto.username !== undefined && dto.username !== user.username) {
        const existing = await this.usersRepository.findOne({
          where: { username: dto.username },
          select: ['id'],
        });
        if (existing && existing.id !== userId) {
          throw new ConflictException('Username already exists');
        }
        user.username = dto.username;
      }
      if (dto.firstName !== undefined) {
        user.firstName = dto.firstName;
      }
      if (dto.lastName !== undefined) {
        user.lastName = dto.lastName;
      }

      let saved: User;
      try {
        saved = await this.usersRepository.save(user);
      } catch (error) {
        if (error.code === '23505') {
          throw new ConflictException('Username already exists');
        }
        throw error;
      }

      await invalidateAfterAuthProfileChange(this.appCache, userId);

      const profile = this.toMyProfileDto(saved);
      const response: UpdateMyProfileResponseDto = { profile };

      if (jwtFieldsChanged) {
        const expiresIn = this.configService.get<number>('EXPIRE_IN') || 3600;
        response.accessToken = this.signAccessToken(saved);
        response.expiresIn = expiresIn;
      }

      this.logger.verbose(
        `Profile updated for user "${profile.username}" (id: ${userId}).`,
      );
      return response;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to update profile for user id "${userId}".`,
        error.stack,
      );
      throw error;
    }
  }

  async changeMyPassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    this.logger.log(`Password change requested for user id "${userId}".`);
    try {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        select: ['id', 'username', 'password'],
      });
      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found.`);
      }

      const hasPassword = !!user.password;

      if (hasPassword) {
        if (!dto.currentPassword) {
          throw new BadRequestException('Current password is required');
        }
        const isValid = await bcrypt.compare(
          dto.currentPassword,
          user.password,
        );
        if (!isValid) {
          throw new UnauthorizedException('Invalid current password');
        }
        const sameAsOld = await bcrypt.compare(dto.newPassword, user.password);
        if (sameAsOld) {
          throw new BadRequestException(
            'New password must be different from the current password',
          );
        }
      }

      const salt = await bcrypt.genSalt();
      user.password = await bcrypt.hash(dto.newPassword, salt);
      await this.usersRepository.save(user);

      this.logger.verbose(
        `Password updated for user "${user.username}" (id: ${userId}).`,
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to change password for user id "${userId}".`,
        error.stack,
      );
      throw error;
    }
  }

  private toMyProfileDto(
    user: Pick<
      User,
      | 'id'
      | 'username'
      | 'firstName'
      | 'lastName'
      | 'email'
      | 'role'
      | 'password'
      | 'googleId'
    >,
  ): MyProfileDto {
    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password,
      hasGoogle: !!user.googleId,
    };
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
    const saved = await this.usersRepository.save(user);
    await invalidateAfterAuthProfileChange(this.appCache, id);
    return saved;
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
      await this.usersRepository.delete(found.id);
      this.logger.verbose(`User with ID "${user.id}" successfully deleted.`);
      await invalidateAfterUserDeletion(this.appCache, found.id);
    } catch (error) {
      this.logger.error(
        `Failed to delete user with ID: "${user.id}".`,
        error.stack,
      );
      throw error;
    }
  }
  async getAllUserIds(): Promise<{ id: string }[]> {
    try {
      const users = await this.usersRepository
        .createQueryBuilder('user')
        .select(['user.id AS id'])
        .getRawMany();

      this.logger.verbose(`All user IDs retrieved successfully.`);
      return users;
    } catch (error) {
      this.logger.error(`Failed to get all user IDs.`, error.stack);
      throw error;
    }
  }
  async getAllUsersWithSelection(tournamentId?: string): Promise<
    {
      id: string;
      username: string;
      firstName: string;
      lastName: string;
      fantasyPoints: number;
      championPoints: number;
    }[]
  > {
    const tid = tournamentId ?? LEGACY_MIGRATION_TOURNAMENT_ID;
    const key = this.appCache.buildPublicKey('auth/users', {
      tournamentId: tid,
    });
    return this.appCache.wrap(key, async () => {
      try {
        const users =
          await this.usersRepository.getAllUsersWithTournamentPoints(tid);
        this.logger.verbose(`All users retrieved successfully.`);
        return users;
      } catch (error) {
        this.logger.error(`Failed to get all users.`, error.stack);
        throw error;
      }
    });
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
  async getUsersWithCursor(
    cursor?: { totalPoints: number; id: string },
    prevCursor?: { totalPoints: number; id: string },
    limit: number = 15,
    leagueId?: string,
    tournamentId?: string,
  ) {
    const tid = tournamentId ?? LEGACY_MIGRATION_TOURNAMENT_ID;
    const key = this.appCache.buildPublicKey('auth/standings', {
      cursorId: cursor?.id,
      cursorPoints: cursor?.totalPoints,
      prevCursorId: prevCursor?.id,
      prevCursorPoints: prevCursor?.totalPoints,
      leagueId,
      limit,
      tournamentId: tid,
    });
    return this.appCache.wrap(key, async () => {
      try {
        const response = await this.usersRepository.getUsersWithCursor(
          limit,
          tid,
          cursor,
          prevCursor,
          leagueId,
        );
        return response;
      } catch (error) {
        this.logger.error(`Failed to get users with cursor.`, error.stack);
        throw error;
      }
    });
  }

  async getMyStandingsPosition(
    user: User,
    tournamentId?: string,
    leagueId?: string,
  ): Promise<{
    tournamentId: string;
    leagueId: string | null;
    position: number;
    fantasyPoints: number;
    championPoints: number;
    totalPoints: number;
  }> {
    const key = this.appCache.buildUserKey(user.id, 'auth/standings/me', {
      leagueId,
      tournamentId,
    });
    return this.appCache.wrap(key, async () =>
      this.loadMyStandingsPosition(user, tournamentId, leagueId),
    );
  }

  private async loadMyStandingsPosition(
    user: User,
    tournamentId?: string,
    leagueId?: string,
  ): Promise<{
    tournamentId: string;
    leagueId: string | null;
    position: number;
    fantasyPoints: number;
    championPoints: number;
    totalPoints: number;
  }> {
    try {
      let resolvedTournamentId = tournamentId ?? LEGACY_MIGRATION_TOURNAMENT_ID;
      let resolvedLeagueId: string | null = null;

      if (leagueId) {
        const leagueEntity = await this.privateLeagueRepo.findOne({
          where: { id: leagueId },
          relations: ['users', 'tournament'],
        });
        if (!leagueEntity) {
          throw new NotFoundException(
            `League with id: ${leagueId} was not found.`,
          );
        }
        if (user.role !== Role.ADMIN) {
          const isMember = leagueEntity.users?.some((u) => u.id === user.id);
          if (!isMember) {
            throw new ForbiddenException(
              'You do not have access to this league.',
            );
          }
        }
        if (tournamentId && tournamentId !== leagueEntity.tournament.id) {
          throw new BadRequestException(
            'tournamentId does not match this league.',
          );
        }
        resolvedTournamentId = tournamentId ?? leagueEntity.tournament.id;
        resolvedLeagueId = leagueId;
      }

      const rank = await this.usersRepository.getUserStandingsRank(
        user.id,
        resolvedTournamentId,
        leagueId,
      );

      if (!rank) {
        if (leagueId) {
          throw new NotFoundException(
            'Could not resolve your rank for this league (you may not be a member).',
          );
        }
        throw new InternalServerErrorException(
          'Could not compute standings rank.',
        );
      }

      return {
        tournamentId: resolvedTournamentId,
        leagueId: resolvedLeagueId,
        ...rank,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(`Failed to get my standings position.`, error.stack);
      throw error;
    }
  }

  async getHomeStandingsPreview(
    user: User,
    tournamentId: string,
  ): Promise<HomeStandingsPreviewDto> {
    const key = this.appCache.buildUserKey(
      user.id,
      'auth/standings/home-preview',
      {
        tournamentId,
      },
    );
    return this.appCache.wrap(key, async () => {
      try {
        return await this.loadHomeStandingsPreview(user, tournamentId);
      } catch (error) {
        if (
          error instanceof NotFoundException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
        this.logger.error(
          `Failed to get home standings preview.`,
          error instanceof Error ? error.stack : undefined,
        );
        throw error;
      }
    });
  }

  private async loadHomeStandingsPreview(
    user: User,
    tournamentId: string,
  ): Promise<HomeStandingsPreviewDto> {
    try {
      const exists = await this.tournamentRepo.exist({
        where: { id: tournamentId },
      });
      if (!exists) {
        throw new NotFoundException(
          `Tournament with id: ${tournamentId} was not found.`,
        );
      }

      const leagues = (await this.getAllUserLeagues(user, tournamentId)).filter(
        (l) => l?.id,
      );

      const rankResults = await Promise.all([
        this.usersRepository.getUserStandingsRank(user.id, tournamentId),
        ...leagues.map((league) =>
          this.usersRepository.getUserStandingsRank(
            user.id,
            tournamentId,
            league.id,
          ),
        ),
      ]);

      const globalRank = rankResults[0];
      const leagueRanks = rankResults.slice(1);

      if (!globalRank) {
        throw new InternalServerErrorException(
          'Could not compute standings rank.',
        );
      }

      const privateLeagues = leagues.map((league, i) => {
        const rank = leagueRanks[i];
        if (!rank) {
          throw new NotFoundException(
            'Could not resolve your rank for this league (you may not be a member).',
          );
        }
        return {
          id: league.id,
          name: league.name,
          position: rank.position,
          totalPoints: rank.totalPoints,
        };
      });

      return {
        global: {
          position: globalRank.position,
          totalPoints: globalRank.totalPoints,
          label: 'Global',
        },
        privateLeagues,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to get home standings preview.`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /// Unfinished function, need to see if neccessary
  async checkIfGuessedForChampions(
    stage: PlayoffsStage,
    user: User,
  ): Promise<boolean> {
    const key = this.appCache.buildUserKey(
      user.id,
      'auth/check-champions-guess',
      {
        stage,
      },
    );
    return this.appCache.wrap(key, async () => {
      try {
        await this.usersRepository.getChampionsGuesses(user.id);

        return true;
      } catch (error) {
        this.logger.error(error);
      }
    });
  }
  async getUserGuessesForCheck(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: { id: true },
      relations: [
        'bestOf7Guesses',
        'playerMatchupGuesses',
        'spontaneousGuesses',
      ],
      loadRelationIds: {
        relations: [
          'bestOf7Guesses.bet',
          'playerMatchupGuesses.bet',
          'spontaneousGuesses.bet',
        ],
      },
    });

    return {
      bestOf7GuessIds: new Set(
        user.bestOf7Guesses.map((g) => g.betId as string),
      ),
      matchupGuessIds: new Set(
        user.playerMatchupGuesses.map((g) => g.betId as string),
      ),
      spontaneousGuessIds: new Set(
        user.spontaneousGuesses.map((g) => g.betId as string),
      ),
    };
  }
  async getUserSpontanouesGuess(user: User): Promise<SpontaneousGuess[]> {
    try {
      const foundUser = await this.usersRepository.findOne({
        where: { id: user.id },
        relations: ['spontaneousGuesses'],
      });
      return foundUser.spontaneousGuesses;
    } catch (error) {
      this.logger.error(
        `Failed to get Spontaneous guesses of user:${user.username}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to get Spontaneous guesses of user:${user.username}`,
      );
    }
  }
  async getUserGuessesForSeries(
    seriesId: string,
    user: User,
  ): Promise<{
    bestOf7Guess: BestOf7Guess;
    teamWinGuess: TeamWinGuess;
    playerMatchupGuesses: PlayerMatchupGuess[];
    spontaneousGuesses: SpontaneousGuess[];
  }> {
    const key = this.appCache.buildUserKey(
      user.id,
      'auth/user-guesses-for-series',
      { seriesId },
    );
    return this.appCache.wrap(key, async () => {
      try {
        const guesses = await this.seriesService.getGuessesByUser(
          seriesId,
          user,
        );
        return {
          bestOf7Guess: guesses.bestOf7Guess,
          teamWinGuess: guesses.teamWinGuess,
          playerMatchupGuesses: guesses.playerMatchupGuess,
          spontaneousGuesses: guesses.spontanouesGuess,
        };
      } catch (error) {
        this.logger.error(
          `Failed to get guesses of user:${user.username}`,
          error.stack,
        );
        throw new InternalServerErrorException(
          `Failed to get guesses of user:${user.username}`,
        );
      }
    });
  }
  async getUserChampionsGuesses(userId: string): Promise<User> {
    try {
      const foundUser = await this.usersRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.championTeamGuesses', 'championTeamGuesses')
        .leftJoinAndSelect('championTeamGuesses.stage', 'championStage')
        .leftJoinAndSelect('championStage.tournament', 'championTournament')
        .leftJoinAndSelect(
          'championTeamGuesses.teamRelation',
          'championTeamRelation',
        )
        .addSelect(['championStage.name'])
        .leftJoinAndSelect('user.mvpGuesses', 'mvpGuesses')
        .leftJoinAndSelect('mvpGuesses.stage', 'mvpStage')
        .leftJoinAndSelect('mvpStage.tournament', 'mvpTournament')
        .addSelect(['mvpStage.name'])
        .leftJoinAndSelect(
          'user.conferenceFinalGuesses',
          'conferenceFinalGuesses',
        )
        .leftJoinAndSelect('conferenceFinalGuesses.stage', 'conferenceStage')
        .leftJoinAndSelect('conferenceStage.tournament', 'conferenceTournament')
        .leftJoinAndSelect('conferenceFinalGuesses.team1Relation', 'cfTeam1')
        .leftJoinAndSelect('conferenceFinalGuesses.team2Relation', 'cfTeam2')
        .addSelect(['conferenceStage.name'])
        .where('user.id = :userId', { userId })
        .getOne();
      return foundUser;
    } catch (error) {
      this.logger.error(
        `Failed to fetch champion guesses for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new Error('Failed to fetch user champion guesses');
    }
  }
  async getUserGuesses(user: User): Promise<User> {
    const key = this.appCache.buildUserKey(user.id, 'auth/user-guesses', {});
    return this.appCache.wrap(key, async () => {
      try {
        const foundUser = await this.usersRepository.findOne({
          where: { id: user.id },
          relations: [
            'bestOf7Guesses',
            'teamWinGuesses',
            'playerMatchupGuesses',
            'spontaneousGuesses',
          ],
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
    });
  }
  async validateGoogleUser(googleUser: AuthCredentialsDto): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { googleId: googleUser.googleId },
    });
    if (user) return user;
    return await this.signUp(googleUser);
  }

  async getAllUserLeagues(user: User, tournamentId?: string): Promise<any[]> {
    try {
      const qb = this.usersRepository
        .createQueryBuilder('user')
        .leftJoin('user.privateLeagues', 'league')
        .leftJoin('league.admin', 'admin')
        .select([
          'league.id',
          'league.name',
          'league.code',
          'league.tournamentId',
          'admin.id',
        ])
        .where('user.id = :userId', { userId: user.id });
      if (tournamentId) {
        qb.andWhere('league.tournamentId = :tournamentId', { tournamentId });
      }
      const leagues = await qb.getRawMany();

      // Convert raw results to desired format
      const result = leagues.map((row) => ({
        id: row.league_id,
        name: row.league_name,
        code: row.league_code,
        tournamentId: row.league_tournamentId,
        admin: { id: row.admin_id },
      }));

      return result;
    } catch (error) {
      this.logger.error(`Failed to get all user leagues. ${error.stack}`);
      throw new InternalServerErrorException(`Failed to get all user leagues.`);
    }
  }

  async searchUsers(query: string): Promise<User[]> {
    try {
      if (!query) return [];
      return this.usersRepository
        .createQueryBuilder('user')
        .where('LOWER(user.firstName) LIKE :query', {
          query: `%${query.toLowerCase()}%`,
        })
        .orWhere('LOWER(user.lastName) LIKE :query', {
          query: `%${query.toLowerCase()}%`,
        })
        .orWhere(
          "LOWER(CONCAT(user.firstName, ' ', user.lastName)) LIKE :query",
          { query: `%${query.toLowerCase()}%` },
        )
        .orWhere('LOWER(user.username) LIKE :query', {
          query: `%${query.toLowerCase()}%`,
        })
        .orderBy('user.firstName', 'ASC')
        .limit(10) // Limit the number of results for performance
        .getMany();
    } catch (error) {
      this.logger.error(`Failed to search for users. ${error.stack}`);
      throw new InternalServerErrorException(`Failed to search for users.`);
    }
  }
}
