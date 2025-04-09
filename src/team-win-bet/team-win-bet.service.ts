import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TeamWinBetRepository } from './team-win-bet.repository';
import { CreateTeamWinBetDto } from './dto/create-team-win-bet.dto';
import { TeamWinBet } from './team-win-bet.entity';
import { UpdateResultDto } from './dto/update-result.dto';
import { UpdateFantasyPointsDto } from 'src/best-of7-bet/dto/update-fantasy-points.dto';
import { AuthService } from 'src/auth/auth.service';
import { BestOf7Bet } from 'src/best-of7-bet/bestOf7.entity';
import { User } from 'src/auth/user.entity';
import { TeamWinGuessService } from 'src/team-win-guess/team-win-guess.service';
import { TeamWinGuess } from 'src/team-win-guess/team-win-guess.entity';

@Injectable()
export class TeamWinBetService {
  private logger = new Logger('TeamWinBetService', { timestamp: true });
  constructor(
    private teamWinBetRepository: TeamWinBetRepository,
    private usersService: AuthService,
    @Inject(forwardRef(() => TeamWinGuessService))
    private teamWinGuessSerive: TeamWinGuessService,
  ) {}

  async createTeamWinBet(
    createTeamWinBetDto: CreateTeamWinBetDto,
  ): Promise<TeamWinBet> {
    this.logger.verbose(`Trying to create TeamWinBet.`);
    return await this.teamWinBetRepository.createTeamWinBet(
      createTeamWinBetDto,
    );
  }
  async getAllWithResults(): Promise<
    { id: string; result: number; seriesId: string; fantasyPoints: number }[]
  > {
    const raw = await this.teamWinBetRepository
      .createQueryBuilder('bet')
      .select([
        'bet.id AS id',
        'bet.result AS result',
        'bet.seriesId AS "seriesId"',
        'bet.fantasyPoints AS "fantasyPoints"',
      ])
      .getRawMany();
    return raw;
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
  async deleteBet(id: string): Promise<void> {
    try {
      const bet = await this.teamWinBetRepository.findOne({ where: { id } });
      await Promise.all(
        bet.guesses.map(async (guess) => {
          await this.teamWinGuessSerive.deleteGuess(guess.id);
        }),
      );
      await this.teamWinBetRepository.delete(bet.id);
      this.logger.verbose(`Team win Bet with ID "${id}" successfully deleted.`);
    } catch (error) {
      this.logger.error(
        `Failed to delete team win bet with ID: "${id}".`,
        error.stack,
      );
      throw error;
    }
  }
  private calculatePointsForGuess(guess, savedBet, previousResult): number {
    let points = 0;

    const isGuessCorrectNow = guess.guess === savedBet.result;
    const wasGuessCorrectBefore = guess.guess === previousResult;

    // Correct Now, Incorrect Before → Add Points
    if (isGuessCorrectNow && !wasGuessCorrectBefore) {
      points += savedBet.fantasyPoints;
    }

    // Case 2: Incorrect Now, Correct Before → Subtract Points
    else if (!isGuessCorrectNow && wasGuessCorrectBefore) {
      points -= savedBet.fantasyPoints;
    }

    // Case 3 & 4: No Change → No Points Added or Subtracted
    // - Both Correct or Both Incorrect
    else {
      points = 0;
    }

    console.log(
      `Calculated Points for User: ${guess.createdById}, Points: ${points}`,
    );
    return points;
  }
  async getActiveBets(): Promise<any[]> {
    const bets = await this.teamWinBetRepository
      .createQueryBuilder('bet')
      .leftJoin('bet.series', 'series')
      .addSelect(['series.id'])
      .where('series.dateOfStart > :now', { now: new Date() })
      .getMany();

    return bets.map((bet) => ({
      id: bet.id,
      fantasyPoints: bet.fantasyPoints,
      result: bet.result,
      seriesId: bet.seriesId,
    }));
  }

  async updateResult(
    updateResultDto: UpdateResultDto,
    id: string,
    isSeriesFinished?: boolean,
    bestOf7Bet?: BestOf7Bet,
  ): Promise<void> {
    const bet = await this.getTeamWinBetById(id);
    const previousResult = bet.result;

    bet.result = updateResultDto.result;
    try {
      await this.teamWinBetRepository.update(bet.id, {
        result: updateResultDto.result,
      });

      const savedBet = await this.getTeamWinBetById(id);
      this.logger.verbose(`Bet with ID "${id}" successfully updated.`);

      const userPointsMap = new Map<User, number>();

      // Step 1: Collect BestOf7 Points if Series Finished
      // if (isSeriesFinished) {
      //   bestOf7Bet.guesses.forEach((g) => {
      //     if (g.guess === bestOf7Bet.result) {
      //       userPointsMap.set(
      //         g.createdBy,
      //         (userPointsMap.get(g.createdBy) || 0) + bestOf7Bet.fantasyPoints,
      //       );
      //     }
      //   });
      // }

      // // Step 2: Collect Points from TeamWinBet
      // savedBet.guesses.forEach((guess) => {
      //   const points = this.calculatePointsForGuess(
      //     guess,
      //     savedBet,
      //     previousResult,
      //   );

      //   if (points !== 0) {
      //     userPointsMap.set(
      //       guess.createdBy,
      //       (userPointsMap.get(guess.createdBy) || 0) + points,
      //     );
      //   }
      // });
      // for (const [userId, totalPoints] of userPointsMap.entries()) {
      //   await this.usersService.updateFantasyPoints(userId, totalPoints);
      // }

      // const updatePromises = savedBet.guesses.map(async (guess) => {
      //   const points = this.calculatePointsForGuess(
      //     guess,
      //     savedBet,
      //     previousResult,
      //   );

      //   // Only update points if there was a change
      //   if (points !== 0) {
      //     await this.usersService.updateFantasyPoints(guess.createdBy, points);
      //   }
      // });

      // // Perform all updates in parallel
      // await Promise.all(updatePromises);
    } catch (error) {
      this.logger.error(`Failed to update bet with ID: "${id}".`, error.stack);
      throw error;
    }
  }
  async getUserGuess(
    teamWinBet: TeamWinBet,
    userId: string,
  ): Promise<TeamWinGuess> {
    try {
      const guess = teamWinBet.guesses.filter((g) => g.createdById === userId);
      return guess[0];
    } catch (error) {
      this.logger.error(
        `Failed to get user guess for bet with ID: "${teamWinBet.id}" and user:${userId}.`,
        error.stack,
      );
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
