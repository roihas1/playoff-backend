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
import { AppDataSource } from 'src/data-source';

@Injectable()
export class UsersRepository extends Repository<User> {
  private logger = new Logger('UsersRepository', { timestamp: true });
  constructor(dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }
  async createUser(authCredentialsDto: AuthCredentialsDto): Promise<User> {
    const { username, password, role, firstName, lastName, email, googleId } =
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
      role: role,
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
        throw new InternalServerErrorException(
          `Failed to create user ${error}`,
        );
      }
    }
  }
  async getChampionsGuesses(id: string): Promise<any> {
    const query = this.createQueryBuilder('user')
      .leftJoinAndSelect(
        'user.conferenceFinalGuesses',
        'conferenceFinalGuesses',
      ) // Join and select related data
      .leftJoinAndSelect('user.championTeamGuesses', 'championTeamGuesses')
      .leftJoinAndSelect('user.mvpGuesses', 'mvpGuesses')
      .leftJoinAndSelect('conferenceFinalGuesses.stage', 'playoffsStage1')
      .leftJoinAndSelect('championTeamGuesses.stage', 'playoffsStage2')
      .leftJoinAndSelect('mvpGuesses.stage', 'playoffsStage3')
      .where('user.id = :id', { id });

    const res = await query.getOne();
    return res;
  }
  async getUsersWithCursor(
    limit: number,
    cursor?: { totalPoints: number; id: string },
    prevCursor?: { totalPoints: number; id: string },
    leagueId?: string,
  ) {
    const order = prevCursor ? 'ASC' : 'DESC';
    const realLimit = limit + 1;

    const query = this.createQueryBuilder('user')
      .leftJoin('user.privateLeagues', 'league')
      .addSelect('user.fantasyPoints + user.championPoints', 'totalPoints')
      .take(realLimit)
      .distinct(true);

    query
      .orderBy('user.fantasyPoints + user.championPoints', order)
      .addOrderBy('user.id', order);

    if (leagueId) {
      query.andWhere('league.id = :leagueId', { leagueId });
    }

    if (prevCursor) {
      query.andWhere(
        '(user.fantasyPoints + user.championPoints > :points OR ((user.fantasyPoints + user.championPoints = :points) AND user.id > :id))',
        { points: prevCursor.totalPoints, id: prevCursor.id },
      );
    } else if (cursor) {
      query.andWhere(
        '(user.fantasyPoints + user.championPoints < :points OR ((user.fantasyPoints + user.championPoints = :points) AND user.id < :id))',
        { points: cursor.totalPoints, id: cursor.id },
      );
    }

    const rawUsers = await query.getRawMany();

    const users = rawUsers.map((raw) => ({
      id: raw.user_id,
      username: raw.user_username,
      firstName: raw.user_firstName,
      lastName: raw.user_lastName,
      fantasyPoints: raw.user_fantasyPoints,
      championPoints: raw.user_championPoints,
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
        .orderBy('user.fantasyPoints + user.championPoints', 'DESC')
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

  async updateBulkFantasyPoints(
    userPointsMap: { id: string; points: number }[],
  ): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const user of userPointsMap) {
        await queryRunner.manager.update(User, user.id, {
          fantasyPoints: user.points,
        });
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateFantasyPoints(user: User, points: number): Promise<void> {
    const queryRunner = AppDataSource.createQueryRunner();

    // Start the transaction
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      console.log(
        `Before user id: ${user.id} ${user.fantasyPoints} added ${points}`,
      );

      user.fantasyPoints += points;

      console.log(
        `After user id: ${user.id} ${user.fantasyPoints} added ${points}`,
      );

      // Use queryRunner to ensure the operation is part of the transaction
      await queryRunner.manager.update(User, user.id, {
        fantasyPoints: user.fantasyPoints,
      });

      // Commit the transaction explicitly
      await queryRunner.commitTransaction();
      this.logger.verbose(
        `User: ${user.username} points were updated. added (${points})`,
      );
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to update fantasy points for user:${user.username}`,
        error.stack,
      );
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }
}
