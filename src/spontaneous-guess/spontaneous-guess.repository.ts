import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { SpontaneousGuess } from './spontaneous-guess.entity';
import { SpontaneousBet } from 'src/spontaneous-bet/spontaneousBet.entity';
import { User } from 'src/auth/user.entity';

@Injectable()
export class SpontaneousGuessRepo extends Repository<SpontaneousGuess> {
  private logger = new Logger('SpontaneousGuessRepo', { timestamp: true });
  constructor(dataSource: DataSource) {
    super(SpontaneousGuess, dataSource.createEntityManager());
  }

  async createSpontaneousGuess(
    guess: number,
    spontaneousBet: SpontaneousBet,
    user: User,
  ): Promise<SpontaneousGuess> {
    const spontaneousGuess = this.create({
      guess,
      bet: spontaneousBet,
      createdBy: user,
    });
    const savedGuess = await this.save(spontaneousGuess);
    return savedGuess;
  }
}
