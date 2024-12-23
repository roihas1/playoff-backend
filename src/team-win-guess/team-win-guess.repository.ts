import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { TeamWinGuess } from './team-win-guess.entity';
import { TeamWinBet } from 'src/team-win-bet/team-win-bet.entity';
import { User } from 'src/auth/user.entity';

@Injectable()
export class TeamWinGuessRepository extends Repository<TeamWinGuess> {
  private logger = new Logger('TeamWinGuessRepository', { timestamp: true });
  constructor(dataSource: DataSource) {
    super(TeamWinGuess, dataSource.createEntityManager());
  }

  async createTeamWinGuess(
    guess: number,
    teamWinBet: TeamWinBet,
    user: User,
  ): Promise<TeamWinGuess> {
    const existingGuess = await this.findOne({
      where: {
        bet: teamWinBet,
        createdBy: user,
      },
    });
    if (existingGuess) {
      this.logger.error(
        `User ${user.id} have already made a guess for the bet with id ${teamWinBet.id}.`,
      );
      throw new ConflictException(
        `User ${user.id} have already made a guess for the bet with id ${teamWinBet.id}.`,
      );
    }

    const teamWinGuess = this.create({
      guess,
      bet: teamWinBet,
      createdBy: user,
    });
    try {
      const savedTeamWinGuess = await this.save(teamWinGuess);
      this.logger.verbose(
        `teamWinGuess "${savedTeamWinGuess.id}" created successfully.`,
      );
      return savedTeamWinGuess;
    } catch (error) {
      this.logger.error(`Failed to create teamWinGuess.`, error.stack);

      throw new InternalServerErrorException();
    }
  }
}
