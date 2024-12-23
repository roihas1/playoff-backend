import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TeamWinGuess } from './team-win-guess.entity';
import { TeamWinBetService } from 'src/team-win-bet/team-win-bet.service';
import { TeamWinGuessRepository } from './team-win-guess.repository';
import { User } from 'src/auth/user.entity';
import { CreateTeamWinGuessDto } from './dto/create-team-win-guess.dto';
import { UpdateGuessDto } from 'src/player-matchup-guess/dto/update-guess.dto';

@Injectable()
export class TeamWinGuessService {
  private logger = new Logger('TeamWinGuessService', { timestamp: true });
  constructor(
    private teamWinGuessRepository: TeamWinGuessRepository,
    private teamWinBetService: TeamWinBetService,
  ) {}

  async createTeamWinGuess(
    createTeamWinGuessDto: CreateTeamWinGuessDto,
    user: User,
  ): Promise<TeamWinGuess> {
    this.logger.verbose(`Trying to create teamWinGuess.`);
    const { guess, teamWinBetId } = createTeamWinGuessDto;
    const teamWinBet =
      await this.teamWinBetService.getTeamWinBetById(teamWinBetId);

    return await this.teamWinGuessRepository.createTeamWinGuess(
      guess,
      teamWinBet,
      user,
    );
  }

  async getGuessById(id: string): Promise<TeamWinGuess> {
    const found = await this.teamWinGuessRepository.findOne({
      where: { id },
      relations: ['bet', 'createdBy'],
    });
    if (!found) {
      this.logger.error(`TeamWinGuess with ID ${id} not found.`);
      throw new NotFoundException(`TeamWinGuess with ID ${id} not found.`);
    }
    this.logger.verbose(`TeamWinGuess with ID: ${id} retrieved succesfully.`);
    return found;
  }

  async updateGuess(
    id: string,
    updateGuessDto: UpdateGuessDto,
  ): Promise<TeamWinGuess> {
    const bet = await this.getGuessById(id);
    bet.guess = updateGuessDto.guess;

    try {
      const savedBet = await this.teamWinGuessRepository.save(bet);
      this.logger.verbose(`Bet with ID "${id}" successfully updated.`);
      return savedBet;
    } catch (error) {
      this.logger.error(`Failed to update bet with ID: "${id}".`, error.stack);
      throw error;
    }
  }
}
