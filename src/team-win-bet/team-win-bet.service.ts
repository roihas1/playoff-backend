import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TeamWinBetRepository } from './team-win-bet.repository';
import { CreateTeamWinBetDto } from './dto/create-team-win-bet.dto';
import { TeamWinBet } from './team-win-bet.entity';
import { UpdateResultDto } from './dto/update-result.dto';
import { UpdateFantasyPointsDto } from 'src/best-of7-bet/dto/update-fantasy-points.dto';

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

  async getTeamWinBetById(teamWinBetId: string): Promise<TeamWinBet> {
    const found = await this.teamWinBetRepository.findOne({
      where: { id: teamWinBetId },
    });
    if (!found) {
      this.logger.error(`teamWinBet with ID ${teamWinBetId} not found.`);
      throw new NotFoundException(
        `teamWinBet with ID ${teamWinBetId} not found.`,
      );
    }
    return found;
  }
  async updateResult(
    updateResultDto: UpdateResultDto,
    id: string,
  ): Promise<TeamWinBet> {
    const bet = await this.getTeamWinBetById(id);
    bet.result = updateResultDto.result;

    try {
      const savedBet = await this.teamWinBetRepository.save(bet);
      this.logger.verbose(`Bet with ID "${id}" successfully updated.`);
      return savedBet;
    } catch (error) {
      this.logger.error(`Failed to update bet with ID: "${id}".`, error.stack);
      throw error;
    }
  }
  async updateFantasyPoints(
    updateFantasyPointsDto: UpdateFantasyPointsDto,
    id: string,
  ): Promise<TeamWinBet> {
    const bet = await this.getTeamWinBetById(id);
    bet.fantasyPoints = updateFantasyPointsDto.fantasyPoints;
    try {
      const savedBet = await this.teamWinBetRepository.save(bet);
      this.logger.verbose(`Bet with ID "${id}" successfully updated.`);
      return savedBet;
    } catch (error) {
      this.logger.error(`Failed to update bet with ID: "${id}".`, error.stack);
      throw error;
    }
  }
}
