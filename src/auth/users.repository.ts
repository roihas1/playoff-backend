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
        throw new InternalServerErrorException();
      }
    }
  }
  async getChampionsGuesses(id: string): Promise<any> {
    const query = this.createQueryBuilder('user')
      .leftJoinAndSelect(
        'user.conferenceFinalGuesses',
        'conferenceFinalGuesses',
      ) // Join and select related data
      .leftJoinAndSelect('user.championTeamGuesses', 'championTeamGuesses') // Join and select related data
      .leftJoinAndSelect('user.mvpGuesses', 'mvpGuesses')
      .leftJoinAndSelect('conferenceFinalGuesses.stage', 'playoffsStage1')
      .leftJoinAndSelect('championTeamGuesses.stage', 'playoffsStage2')
      .leftJoinAndSelect('mvpGuesses.stage', 'playoffsStage3') // Join and select related data
      .where('user.id = :id', { id });

    const res = await query.getOne();
    return res;
  }
  async getUsersWithCursor(
    limit: number,
    cursor?: { points: number; id: string },
    prevCursor?: { points: number; id: string },
    leagueId?: string,
  ) {
    // const query = this.createQueryBuilder('user');
    const order = prevCursor ? 'ASC' : 'DESC';
    const newLimit: number = Number(limit) + 1;
    const query = this.createQueryBuilder('user')
      .leftJoin('user.privateLeagues', 'league')
      .orderBy('user.fantasyPoints', order)
      .addOrderBy('user.id', order)
      .take(newLimit);

    if (leagueId) {
      query.andWhere('league.id = :leagueId', { leagueId }); // ✅ Filter by leagueId
    }
    if (prevCursor) {
      // Fetch previous users in ASC order
      query.where(
        'user.fantasyPoints > :prevCursorPoints OR (user.fantasyPoints = :prevCursorPoints AND user.id > :prevCursorId)',
        { prevCursorPoints: prevCursor.points, prevCursorId: prevCursor.id },
      );
      // .orderBy('user.fantasyPoints', 'ASC') // Reverse order
      // .addOrderBy('user.id', 'ASC');
    } else {
      if (cursor) {
        // Fetch next users normally
        query.where(
          'user.fantasyPoints < :cursorPoints OR (user.fantasyPoints = :cursorPoints AND user.id < :cursorId)',
          { cursorPoints: cursor.points, cursorId: cursor.id },
        );
      }
    }

    const users = await query.getMany();

    let nextCursor: { points: number; id: string } | null = null;
    let newPrevCursor: { points: number; id: string } | null = null;
    if (users.length > limit) {
      // If we fetched more than the limit, set nextCursor & remove the extra user
      nextCursor = {
        points: users[limit - 1].fantasyPoints,
        id: users[limit - 1].id,
      };
      users.splice(limit);
    }

    if (prevCursor) {
      // Since we reversed the order, we must flip the results back to descending order
      users.reverse();
      nextCursor = {
        points: users[limit - 1].fantasyPoints,
        id: users[limit - 1].id,
      };
      const firstUser = await this.createQueryBuilder('user')
        .orderBy('user.fantasyPoints', 'DESC')
        .addOrderBy('user.id', 'DESC')
        .getOne(); // Get the very first user in the dataset

      if (users.length > 0 && firstUser && firstUser.id === users[0].id) {
        // check if we got the first page
        newPrevCursor = null;
      } else {
        newPrevCursor =
          users.length > 0
            ? { points: users[0].fantasyPoints, id: users[0].id }
            : null;
      }
    } else if (!cursor && !prevCursor) {
      // first standing
      newPrevCursor = null;
    } else {
      // pressing next
      newPrevCursor =
        users.length > 0
          ? { points: users[0].fantasyPoints, id: users[0].id }
          : null;
    }

    return { data: users, nextCursor, prevCursor: newPrevCursor };
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
