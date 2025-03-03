import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TeamWinBet } from './team-win-bet.entity';
import { CreateTeamWinBetDto } from './dto/create-team-win-bet.dto';

@Injectable()
export class TeamWinBetRepository extends Repository<TeamWinBet> {
  private logger = new Logger('TeamWinBetRepository', { timestamp: true });
  constructor(dataSource: DataSource) {
    super(TeamWinBet, dataSource.createEntityManager());
  }

  async createTeamWinBet(
    createTeamWinBetDto: CreateTeamWinBetDto,
  ): Promise<TeamWinBet> {
    const { seriesId, fantasyPoints } = createTeamWinBetDto;
    const teamWinBet = this.create({
      seriesId,
      fantasyPoints,
    });
    try {
      const savedTeamWinBet = await this.save(teamWinBet);
      this.logger.verbose(
        `teamWinBet "${savedTeamWinBet.id}" created successfully.`,
      );
      return savedTeamWinBet;
    } catch (error) {
      this.logger.error(`Failed to create TeamWinBet.`, error.stack);

      throw new InternalServerErrorException();
    }
  }
  async updateResult(result: number, teamWinId: string): Promise<TeamWinBet> {
    const query = await this.createQueryBuilder()
      .update('team_win_bet')
      .set({ result: result })
      .where('id = :teamWinId', { teamWinId })
      .execute();

    console.log(query);
    return await this.findOne({ where: { id: teamWinId } });
  }
}
