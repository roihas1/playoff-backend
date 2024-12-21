import { Injectable, Logger } from '@nestjs/common';
import { TeamWinBetRepository } from './team-win-bet.repository';
import { CreateTeamWinBetDto } from './dto/create-team-win-bet.dto';
import { TeamWinBet } from './team-win-bet.entity';

@Injectable()
export class TeamWinBetService {
  private logger = new Logger('TeamWinBetService', { timestamp: true });
  constructor(private teamWinBetRepository: TeamWinBetRepository) {}

  async createTeamWinBet(
    createTeamWinBetDto: CreateTeamWinBetDto,
  ): Promise<TeamWinBet> {
    this.logger.verbose(`Trying to create TeamWinBet.`);
    return await this.teamWinBetRepository.createTeamWinBet(
      createTeamWinBetDto,
    );
  }
}
