import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { PlayerMatchupGuess } from './player-matchup-guess.entity';
import { PlayerMatchupBet } from 'src/player-matchup-bet/player-matchup-bet.entity';
import { User } from 'src/auth/user.entity';

@Injectable()
export class PlayerMatchupGuessRepository extends Repository<PlayerMatchupGuess> {
  private logger = new Logger('PlayerMatchupGuessRepository', {
    timestamp: true,
  });
  constructor(dataSource: DataSource) {
    super(PlayerMatchupGuess, dataSource.createEntityManager());
  }

  async createPlayerMatchupGuess(
    guess: number,
    playerMatchupBet: PlayerMatchupBet,
    user: User,
  ): Promise<PlayerMatchupGuess> {
      const playerMatchupGuess = this.create({
      guess,
      bet: playerMatchupBet,
      createdBy: user,
    });
    try {
      const savedPlayerMatchupGuess = await this.save(playerMatchupGuess);
      this.logger.verbose(
        `Player Matchup Guess "${savedPlayerMatchupGuess.id}" created successfully.`,
      );
      return savedPlayerMatchupGuess;
    } catch (error) {
      this.logger.error(`Failed to create PlayerMatchupGuess.`, error.stack);

      throw new InternalServerErrorException();
    }
  }
}
