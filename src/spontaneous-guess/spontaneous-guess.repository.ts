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
    const existingGuess = await this.findOne({
      where: { bet: spontaneousBet, createdBy: user },
    });
    if (existingGuess) {
      this.logger.error(
        `User ${user.id} have already made a guess for the bet with id ${spontaneousBet.id}.`,
      );
      throw new ConflictException(
        `User ${user.id} have already made a guess for the bet with id ${spontaneousBet.id}.`,
      );
    }
    const spontaneousGuess = this.create({
      guess,
      bet: spontaneousBet,
      createdBy: user,
    });
    const savedGuess = await this.save(spontaneousGuess);
    return savedGuess;
  }
}
