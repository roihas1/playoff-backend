import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from './user.entity';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import * as bcrypt from 'bcryptjs';
import { Role } from './user-role.enum';

@Injectable()
export class UsersRepository extends Repository<User> {
  private logger = new Logger('UsersRepository', { timestamp: true });
  constructor(dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }
  async createUser(authCredentialsDto: AuthCredentialsDto): Promise<User> {
    const { username, password, firstName, lastName, email, googleId } =
      authCredentialsDto;

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    let uniqueUsername = username;
    let counter = 1;

    // Check if username already exists, if it does, append a number
    while (await this.findOne({ where: { username: uniqueUsername } })) {
      uniqueUsername = `${username}_${counter}`;
      counter++;
    }
    const user = this.create({
      username: uniqueUsername,
      password: hashedPassword,
      role: Role.USER,
      firstName: firstName,
      lastName: lastName,
      email,
      googleId,
    });
    try {
      return await this.save(user);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Username already exists');
      } else {
        this.logger.error('Failed to create user.', error.stack);
        throw new InternalServerErrorException('Failed to create user');
      }
    }
  }
  async getChampionsGuesses(id: string): Promise<any> {
    const query = this.createQueryBuilder('user')
      .leftJoinAndSelect(
        'user.conferenceFinalGuesses',
        'conferenceFinalGuesses',
      )
      .leftJoinAndSelect('user.championTeamGuesses', 'championTeamGuesses')
      .leftJoinAndSelect('user.mvpGuesses', 'mvpGuesses')
      .leftJoinAndSelect('conferenceFinalGuesses.stage', 'playoffsStage1')
      .leftJoinAndSelect('conferenceFinalGuesses.team1Relation', 'cfTeam1')
      .leftJoinAndSelect('conferenceFinalGuesses.team2Relation', 'cfTeam2')
      .leftJoinAndSelect('championTeamGuesses.stage', 'playoffsStage2')
      .leftJoinAndSelect('championTeamGuesses.teamRelation', 'ctTeam')
      .leftJoinAndSelect('mvpGuesses.stage', 'playoffsStage3')
      .where('user.id = :id', { id });

    const res = await query.getOne();
    return res;
  }
  async getUsersWithCursor(
    limit: number,
    tournamentId: string,
    cursor?: { totalPoints: number; id: string },
    prevCursor?: { totalPoints: number; id: string },
    leagueId?: string,
  ) {
    const order = prevCursor ? 'ASC' : 'DESC';
    const realLimit = limit + 1;

    const totalExpr =
      'COALESCE(utp.fantasyPoints, 0) + COALESCE(utp.championPoints, 0)';

    const query = this.createQueryBuilder('user')
      .leftJoin('user.privateLeagues', 'league')
      .leftJoin(
        'user.tournamentPoints',
        'utp',
        'utp.tournamentId = :tournamentId',
        { tournamentId },
      )
      .addSelect('COALESCE(utp.fantasyPoints, 0)', 'scopedFantasy')
      .addSelect('COALESCE(utp.championPoints, 0)', 'scopedChampion')
      .addSelect(totalExpr, 'totalPoints')
      .take(realLimit)
      .distinct(true);

    query.orderBy(totalExpr, order).addOrderBy('user.id', order);

    if (leagueId) {
      query.andWhere('league.id = :leagueId', { leagueId });
    }

    if (prevCursor) {
      query.andWhere(
        `(${totalExpr} > :points OR ((${totalExpr} = :points) AND user.id > :id))`,
        { points: prevCursor.totalPoints, id: prevCursor.id },
      );
    } else if (cursor) {
      query.andWhere(
        `(${totalExpr} < :points OR ((${totalExpr} = :points) AND user.id < :id))`,
        { points: cursor.totalPoints, id: cursor.id },
      );
    }

    const rawUsers = await query.getRawMany();

    const users = rawUsers.map((raw) => ({
      id: raw.user_id,
      username: raw.user_username,
      firstName: raw.user_firstName,
      lastName: raw.user_lastName,
      fantasyPoints: Number(raw.scopedFantasy ?? raw.scopedfantasy ?? 0),
      championPoints: Number(raw.scopedChampion ?? raw.scopedchampion ?? 0),
      totalPoints: Number(raw.totalPoints),
    }));

    // Determine next/prev cursors
    let nextCursor: { totalPoints: number; id: string } | null = null;
    let newPrevCursor: { totalPoints: number; id: string } | null = null;

    if (users.length > limit) {
      // Set next cursor and trim extra user
      nextCursor = {
        totalPoints:
          users[limit - 1].fantasyPoints + users[limit - 1].championPoints,
        id: users[limit - 1].id,
      };
      users.splice(limit);
    }

    if (prevCursor) {
      users.reverse(); // Flip back to descending order

      nextCursor = {
        totalPoints:
          users[users.length - 1].fantasyPoints +
          users[users.length - 1].championPoints,
        id: users[users.length - 1].id,
      };

      const firstUser = await this.createQueryBuilder('user')
        .leftJoin(
          'user.tournamentPoints',
          'utp',
          'utp.tournamentId = :tournamentId',
          { tournamentId },
        )
        .orderBy(
          'COALESCE(utp.fantasyPoints, 0) + COALESCE(utp.championPoints, 0)',
          'DESC',
        )
        .addOrderBy('user.id', 'DESC')
        .getOne();

      const firstUserId = firstUser?.id;

      if (users.length > 0 && firstUserId === users[0].id) {
        newPrevCursor = null;
      } else {
        newPrevCursor = {
          totalPoints: users[0].fantasyPoints + users[0].championPoints,
          id: users[0].id,
        };
      }
    } else if (!cursor && !prevCursor) {
      newPrevCursor = null; // First page
    } else {
      // After clicking "Next"
      newPrevCursor =
        users.length > 0
          ? {
              totalPoints: users[0].fantasyPoints + users[0].championPoints,
              id: users[0].id,
            }
          : null;
    }

    return {
      data: users,
      nextCursor,
      prevCursor: newPrevCursor,
    };
  }

  async getAllUsersWithTournamentPoints(tournamentId: string): Promise<
    {
      id: string;
      username: string;
      firstName: string;
      lastName: string;
      fantasyPoints: number;
      championPoints: number;
    }[]
  > {
    const rows = await this.createQueryBuilder('user')
      .leftJoin(
        'user.tournamentPoints',
        'utp',
        'utp.tournamentId = :tournamentId',
        { tournamentId },
      )
      .select('user.id', 'id')
      .addSelect('user.username', 'username')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('COALESCE(utp.fantasyPoints, 0)', 'scopedFantasy')
      .addSelect('COALESCE(utp.championPoints, 0)', 'scopedChampion')
      .getRawMany();

    return rows.map((raw) => ({
      id: raw.id,
      username: raw.username,
      firstName: raw.firstName,
      lastName: raw.lastName,
      fantasyPoints: Number(raw.scopedFantasy ?? raw.scopedfantasy ?? 0),
      championPoints: Number(raw.scopedChampion ?? raw.scopedchampion ?? 0),
    }));
  }

  /**
   * Rank matches /auth/standings ordering: totalPoints DESC, user.id DESC.
   * Overall (no leagueId): one row per user — no privateLeagues join.
   * League: same filter as standings — members of that league only.
   */
  async getUserStandingsRank(
    userId: string,
    tournamentId: string,
    leagueId?: string,
  ): Promise<{
    position: number;
    fantasyPoints: number;
    championPoints: number;
    totalPoints: number;
  } | null> {
    const totalExpr =
      'COALESCE(utp.fantasyPoints, 0) + COALESCE(utp.championPoints, 0)';

    const myQb = this.createQueryBuilder('user').leftJoin(
      'user.tournamentPoints',
      'utp',
      'utp.tournamentId = :tournamentId',
      { tournamentId },
    );

    if (leagueId) {
      myQb
        .leftJoin('user.privateLeagues', 'league')
        .andWhere('league.id = :leagueId', { leagueId });
    }

    const myRaw = await myQb
      .addSelect('COALESCE(utp.fantasyPoints, 0)', 'scopedFantasy')
      .addSelect('COALESCE(utp.championPoints, 0)', 'scopedChampion')
      .andWhere('user.id = :userId', { userId })
      .getRawOne();

    if (!myRaw) {
      return null;
    }

    const fantasyPoints = Number(
      myRaw.scopedFantasy ?? myRaw.scopedfantasy ?? 0,
    );
    const championPoints = Number(
      myRaw.scopedChampion ?? myRaw.scopedchampion ?? 0,
    );
    const totalPoints = fantasyPoints + championPoints;

    const aheadQb = this.createQueryBuilder('user').leftJoin(
      'user.tournamentPoints',
      'utp',
      'utp.tournamentId = :tournamentId',
      { tournamentId },
    );

    if (leagueId) {
      aheadQb
        .leftJoin('user.privateLeagues', 'league')
        .andWhere('league.id = :leagueId', { leagueId });
    }

    const ahead = await aheadQb
      .andWhere(
        `(${totalExpr} > :myTotal OR (${totalExpr} = :myTotal AND user.id > :myId))`,
        { myTotal: totalPoints, myId: userId },
      )
      .getCount();

    return {
      position: ahead + 1,
      fantasyPoints,
      championPoints,
      totalPoints,
    };
  }
}
