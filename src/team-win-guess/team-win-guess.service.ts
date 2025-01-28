import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TeamWinGuess } from './team-win-guess.entity';
import { TeamWinBetService } from 'src/team-win-bet/team-win-bet.service';
import { TeamWinGuessRepository } from './team-win-guess.repository';
import { User } from 'src/auth/user.entity';
import { CreateTeamWinGuessDto } from './dto/create-team-win-guess.dto';
import { UpdateGuessDto } from 'src/player-matchup-guess/dto/update-guess.dto';
import { TeamWinBet } from 'src/team-win-bet/team-win-bet.entity';

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
    const found = await this.teamWinGuessRepository.findOne({
      where: {
        createdBy: user,
        bet: teamWinBet,
      },
    });
    if (found) {
      found.guess = guess;
      return await this.teamWinGuessRepository.save(found);
    }
    return await this.teamWinGuessRepository.createTeamWinGuess(
      guess,
      teamWinBet,
      user,
    );
  }

  async getGuessById(
    teamWinBet: TeamWinBet,
    user: User,
  ): Promise<TeamWinGuess> {
    // const bet = await this.teamWinBetService.getTeamWinBetById(id);
    const found = await this.teamWinGuessRepository.findOne({
      where: { createdBy: user, bet: teamWinBet },
      relations: ['bet', 'createdBy'],
    });
    if (!found) {
      this.logger.error(`TeamWinGuess for bet ID ${teamWinBet.id} not found.`);
      throw new NotFoundException(
        `TeamWinGuess for bet ID ${teamWinBet.id} not found.`,
      );
    }
    this.logger.verbose(
      `TeamWinGuess with ID: ${found.id} retrieved succesfully.`,
    );
    return found;
  }

  async updateGuess(
    teamWinBet: TeamWinBet,
    updateGuessDto: UpdateGuessDto,
    user: User,
  ): Promise<TeamWinGuess> {
    const bet = await this.getGuessById(teamWinBet, user);
    bet.guess = updateGuessDto.guess;

    try {
      const savedBet = await this.teamWinGuessRepository.save(bet);
      this.logger.verbose(`TeamWinGuess for bet ID ${teamWinBet.id} updated.`);
      return savedBet;
    } catch (error) {
      this.logger.error(
        `Failed to update bet guess with ID: "${teamWinBet.id}".`,
        error.stack,
      );
      throw error;
    }
  }
  async deleteGuess(id: string): Promise<void> {
    try {
      const found = await this.teamWinGuessRepository.findOne({
        where: { id },
      });
      await this.teamWinGuessRepository.delete(found);
      this.logger.verbose(`TeamWinGuess with ID: ${id} deleted succesfully.`);
      return;
    } catch (error) {
      this.logger.error(`TeamWinGuess with ID: ${id} did not delete.`);
      throw new InternalServerErrorException(
        `TeamWinGuess with ID: ${id} did not delete.`,
      );
    }
  }
}
