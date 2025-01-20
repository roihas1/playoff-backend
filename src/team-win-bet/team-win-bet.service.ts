import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TeamWinBetRepository } from './team-win-bet.repository';
import { CreateTeamWinBetDto } from './dto/create-team-win-bet.dto';
import { TeamWinBet } from './team-win-bet.entity';
import { UpdateResultDto } from './dto/update-result.dto';
import { UpdateFantasyPointsDto } from 'src/best-of7-bet/dto/update-fantasy-points.dto';
import { AuthService } from 'src/auth/auth.service';
import { BestOf7Bet } from 'src/best-of7-bet/bestOf7.entity';
import { User } from 'src/auth/user.entity';

@Injectable()
export class TeamWinBetService {
  private logger = new Logger('TeamWinBetService', { timestamp: true });
  constructor(
    private teamWinBetRepository: TeamWinBetRepository,
    private usersService: AuthService,
  ) {}

  async createTeamWinBet(
    createTeamWinBetDto: CreateTeamWinBetDto,
  ): Promise<TeamWinBet> {
    this.logger.verbose(`Trying to create TeamWinBet.`);
    return await this.teamWinBetRepository.createTeamWinBet(
      createTeamWinBetDto,
    );
  }

  async getTeamWinBetById(teamWinBetId: string): Promise<TeamWinBet> {
    this.logger.verbose(
      `attempting to get team Win bet: ${JSON.stringify(teamWinBetId)}`,
    );
    const found = await this.teamWinBetRepository.findOne({
      where: { id: teamWinBetId },
      relations: ['guesses', 'guesses.createdBy'],
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
    bestOf7Bet?: BestOf7Bet,
  ): Promise<TeamWinBet> {
    let isResultChange = false;
    const bet = await this.getTeamWinBetById(id);
    if (bet.result != updateResultDto.result) {
      console.log('is result change tam win');
      isResultChange = true;
    }
    bet.result = updateResultDto.result;

    try {
      const savedBet = await this.teamWinBetRepository.save(bet);

      this.logger.verbose(`Bet with ID "${id}" successfully updated.`);
      const users: User[] = [];
      await Promise.all(
        savedBet.guesses.map(async (guess) => {
          bestOf7Bet.guesses.map(async (g) => {
            if (g.guess === bestOf7Bet.result) {
              users.push(g.createdBy);
            }
          });
          if (isResultChange) {
            if (guess.guess === savedBet.result) {
              await this.usersService.updateFantasyPoints(
                guess.createdBy,
                users.find((user) => user.id === guess.createdById)
                  ? savedBet.fantasyPoints + bestOf7Bet.fantasyPoints // if the user guessed right the best of 7 bet and the team who won.
                  : savedBet.fantasyPoints,
              );
            } else {
              
              await this.usersService.updateFantasyPoints(
                guess.createdBy,
                users.find((user) => user.id === guess.createdById)
                  ? -(savedBet.fantasyPoints + bestOf7Bet.fantasyPoints) // if the user guessed right the best of 7 bet and the team who won.
                  : -savedBet.fantasyPoints,
              );
            }
          }
        }),
      );
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
