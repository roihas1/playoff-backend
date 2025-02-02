import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Brackets, DataSource, Repository } from 'typeorm';
import { User } from './user.entity';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersRepository extends Repository<User> {
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
}
