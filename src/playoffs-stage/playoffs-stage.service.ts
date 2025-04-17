import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { PlayoffsStageRepository } from './playoffs-stage.repository';
import { PlayoffStage } from './playoffs-stage.entity';
import { User } from 'src/auth/user.entity';
import { CreatePlayoffsStageDto } from './dto/create-playoffs-stage.dto';
import { PlayoffsStage } from './playoffs-stage.enum';
import { CloseGuessesDto } from './dto/close-guesses.dto';
import { ChampionsGuessService } from 'src/champions-guess/champions-guess.service';
import { ConferenceFinalGuess } from 'src/champions-guess/entities/conference-final-guess.entity';
import { ChampionTeamGuess } from 'src/champions-guess/entities/champion-team-guess.entity';
import { MVPGuess } from 'src/champions-guess/entities/mvp-guess.entity';
import { PriorGuesses, PriorGuessesByStage } from './playoffs-stage.controller';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class PlayoffsStageService {
  private logger = new Logger('PlayoffsStageService', { timestamp: true });
  constructor(
    private playoffsStageRepo: PlayoffsStageRepository,
    @Inject(forwardRef(() => ChampionsGuessService))
    private championGuessService: ChampionsGuessService,
    private authService: AuthService,
  ) {}

  async createPlayoffsStage(
    createPlayoffsStageDto: CreatePlayoffsStageDto,
    user: User,
  ): Promise<PlayoffStage> {
    this.logger.verbose(
      `User ${user.username} attempt to create PlayoffsStage ${createPlayoffsStageDto.name}.`,
    );
    const found = await this.playoffsStageRepo.findOne({
      where: {
        name: createPlayoffsStageDto.name,
      },
    });
    if (!found) {
      return await this.playoffsStageRepo.createPlayoffsStage(
        createPlayoffsStageDto.name,
        createPlayoffsStageDto.startDate,
        createPlayoffsStageDto.timeOfStart,
      );
    }
    if (createPlayoffsStageDto.startDate) {
      found.startDate = new Date(createPlayoffsStageDto.startDate);
      await this.playoffsStageRepo.save(found);
    }
    if (createPlayoffsStageDto.startDate) {
      found.timeOfStart = createPlayoffsStageDto.timeOfStart;
      await this.playoffsStageRepo.save(found);
    }

    return found;
  }
  async getPlainPlayoffsStages(): Promise<PlayoffStage[]> {
    try {
      const found = await this.playoffsStageRepo
        .createQueryBuilder('playoff-stage')
        .getMany();

      this.logger.log(`Fetched ${found.length} playoff stages.`);
      return found;
    } catch (error) {
      this.logger.error('Failed to fetch playoff stages', error.stack);
      throw new Error('Could not retrieve playoff stages');
    }
  }
  async getAllPlayoffsStages(): Promise<PlayoffStage[]> {
    const stagesName = ['Before playoffs', 'Round 1', 'Round 2'];
    const found = await this.playoffsStageRepo.getAllPlayoffsStages();
    const stages = found.sort((a, b) => {
      return stagesName.indexOf(a.name) - stagesName.indexOf(b.name);
    });

    return stages;
  }
  async checkGuess(stageName: string, user: User): Promise<boolean> {
    try {
      const [hasChampion, hasConference, hasMVP] = await Promise.all([
        this.championGuessService.hasChampionTeamGuess(stageName, user.id),
        this.championGuessService.hasConferenceFinalGuess(stageName, user.id),
        this.championGuessService.hasMVPGuess(stageName, user.id),
      ]);

      if (stageName === 'Before playoffs') {
        return hasChampion && hasConference && hasMVP;
      }

      return hasChampion && hasMVP;
    } catch (error) {
      this.logger.error(
        `Failed to check guesses for user ${user.id}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  async closeGuesses(closeGuessesDto: CloseGuessesDto): Promise<void> {
    try {
      const {
        easternConferenceFinal,
        westernConferenceFinal,
        finals,
        championTeam,
        mvp,
      } = closeGuessesDto;

      const mvpGuesses = await this.championGuessService.getMVPGuesses();
      const conferenceFinalGuesses =
        await this.championGuessService.getConferenceFinalGuesses();
      const championTeamGuesses =
        await this.championGuessService.getChampionTeamGuesses();
      const users = await this.authService.getAllUsers();

      // Pre-filter guesses by conference
      const eastGuesses = conferenceFinalGuesses.filter(
        (g) => g.conference === 'East',
      );
      const westGuesses = conferenceFinalGuesses.filter(
        (g) => g.conference === 'West',
      );
      const finalsGuesses = conferenceFinalGuesses.filter(
        (g) => g.conference === 'Finals',
      );

      const updates = [];
      for (const user of users) {
        let totalPoints = 0;

        totalPoints += this.championGuessService.checkPointsForUser(
          easternConferenceFinal,
          eastGuesses,
          user.id,
        );

        totalPoints += this.championGuessService.checkPointsForUser(
          westernConferenceFinal,
          westGuesses,
          user.id,
        );

        totalPoints += this.championGuessService.checkPointsForUser(
          finals,
          finalsGuesses,
          user.id,
        );

        totalPoints += this.championGuessService.checkChampionTeamPointsForUser(
          championTeam,
          championTeamGuesses.filter((g) => g.createdBy.id === user.id),
        );

        totalPoints += this.championGuessService.checkMVPPointsForUser(
          mvp,
          mvpGuesses.filter((g) => g.createdBy.id === user.id),
        );

        if (totalPoints > 0) {
          updates.push({ userId: user.id, points: totalPoints });
          this.logger.verbose(
            `User ${user.username} scored ${totalPoints} champion points`,
          );
        }
      }

      await this.authService.bulkUpdateChampionPoints(updates);

      this.logger.verbose('Champion guesses closed and points awarded');
    } catch (error) {
      this.logger.error('Failed to close champion guesses', error.stack);
      throw error;
    }
  }

  // async closeGuesses(closeGuessesDto: CloseGuessesDto): Promise<void> {
  //   try {
  //     // const stages = await this.getAllPlayoffsStages();
  //     const {
  //       easternConferenceFinal,
  //       westernConferenceFinal,
  //       finals,
  //       championTeam,
  //       mvp,
  //     } = closeGuessesDto;
  //     const mvpGuesses = await this.championGuessService.getMVPGuesses();
  //     const conferenceFinalGuesses = await this.championGuessService.getConferenceFinalGuesses();
  //     const championTeamGuesses = await this.championGuessService.getChampionTeamGuesses();

  //     const easternConferenceFinalGuesses: ConferenceFinalGuess[] =
  //       stages[0].conferenceFinalGuesses.filter(
  //         (guess) => guess.conference === 'East',
  //       );
  //     const westernConferenceFinalGuesses: ConferenceFinalGuess[] =
  //       stages[0].conferenceFinalGuesses.filter(
  //         (guess) => guess.conference === 'West',
  //       );
  //     const finalsGuesses: ConferenceFinalGuess[] =
  //       stages[0].conferenceFinalGuesses.filter(
  //         (guess) => guess.conference === 'Finals',
  //       );

  //     const users = await this.authService.getAllUsers();

  //     users.map(async (user) => {
  //       let totalPoints = 0;

  //       const eastPoints = this.championGuessService.checkPointsForUser(
  //         easternConferenceFinal,
  //         easternConferenceFinalGuesses,
  //         user.id,
  //       );
  //       console.log(
  //         `user:${user.username} got ${eastPoints} from east finals team`,
  //       );
  //       totalPoints += eastPoints;
  //       const westPoints = this.championGuessService.checkPointsForUser(
  //         westernConferenceFinal,
  //         westernConferenceFinalGuesses,
  //         user.id,
  //       );
  //       console.log(
  //         `user:${user.username} got ${westPoints} from west finals team`,
  //       );
  //       totalPoints += westPoints;
  //       const finalsPoints = this.championGuessService.checkPointsForUser(
  //         finals,
  //         finalsGuesses,
  //         user.id,
  //       );
  //       console.log(
  //         `user:${user.username} got ${finalsPoints} from finals team`,
  //       );
  //       totalPoints += finalsPoints;

  //       const championTeamPoints =
  //         this.championGuessService.checkChampionTeamPointsForUser(
  //           championTeam,
  //           stages.flatMap((stage) =>
  //             stage.championTeamGuesses.filter(
  //               (guess) => guess.createdBy.id === user.id,
  //             ),
  //           ),
  //         );
  //       console.log(
  //         `user:${user.username} got ${championTeamPoints} from champion team`,
  //       );
  //       totalPoints += championTeamPoints;

  //       const mvpPoints = this.championGuessService.checkMVPPointsForUser(
  //         mvp,
  //         stages.flatMap((stage) =>
  //           stage.mvpGuesses.filter((guess) => guess.createdBy.id === user.id),
  //         ),
  //       );
  //       console.log(`user:${user.username} got ${mvpPoints} from mvp guesses`);
  //       totalPoints += mvpPoints;

  //       if (totalPoints > 0) {
  //         // await this.authService.updateChampionPoints(user, totalPoints);
  //         await this.authService.updateFantasyPoints(user, totalPoints);
  //       }
  //     });

  //     this.logger.verbose('Closing champions guesses succeed');
  //   } catch (error) {
  //     this.logger.error('Failed to close champions guesses');
  //     throw error;
  //   }
  // }
  async getUserGuesses(
    stage: PlayoffsStage,
    user: User,
  ): Promise<{
    conferenceFinalGuesses: ConferenceFinalGuess[];
    championTeamGuesses: ChampionTeamGuess[];
    mvpGuesses: MVPGuess[];
  }> {
    try {
      const userWithGuesses =
        await this.authService.getUserChampionsGuesses(user);

      return {
        conferenceFinalGuesses: userWithGuesses.conferenceFinalGuesses.filter(
          (g) => g.stage.name === stage,
        ),
        championTeamGuesses: userWithGuesses.championTeamGuesses.filter(
          (g) => g.stage.name === stage,
        ),
        mvpGuesses: userWithGuesses.mvpGuesses.filter(
          (g) => g.stage.name === stage,
        ),
      };
    } catch (error) {
      this.logger.error(
        `User: ${user.username} failed to get his guesses. ${error}`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} failed to get his guesses.`,
      );
    }
  }
  private extractCertainProperties(
    conferenceFinalGuesses: ConferenceFinalGuess[],
    championTeamGuesses: ChampionTeamGuess[],
    mvpGuesses: MVPGuess[],
  ): any {
    const conferenceFinalGuessesNew = conferenceFinalGuesses.map((guess) => ({
      id: guess.id,
      team1: guess.team1,
      team2: guess.team2,
      conference: guess.conference,
    }));
    const championTeamGuessesNew = championTeamGuesses.map((guess) => ({
      id: guess.id,
      team: guess.team,
    }));

    // Extract mvpGuesses with selected properties
    const mvpGuessesNew = mvpGuesses.map((guess) => ({
      id: guess.id,
      player: guess.player,
    }));

    return {
      conferenceFinalGuesses: conferenceFinalGuessesNew,
      championTeamGuesses: championTeamGuessesNew,
      mvpGuesses: mvpGuessesNew,
    };
  }
  async getPriorGuesses(
    stage: PlayoffsStage,
    user: User,
  ): Promise<PriorGuesses | PriorGuessesByStage> {
    try {
      if (stage === PlayoffsStage.ROUND1) {
        const guesses = await this.getUserGuesses(
          PlayoffsStage.BEFOREPLAOFFS,
          user,
        );
        const newGuess = this.extractCertainProperties(
          guesses.conferenceFinalGuesses,
          guesses.championTeamGuesses,
          guesses.mvpGuesses,
        );
        return {
          conferenceFinalGuesses: newGuess.conferenceFinalGuesses,
          championTeamGuesses: newGuess.championTeamGuesses,
          mvpGuesses: newGuess.mvpGuesses,
        };
      } else if (
        stage === PlayoffsStage.ROUND2 ||
        stage === PlayoffsStage.FINISH
      ) {
        const beforePlayoffsStageGuesses = await this.getUserGuesses(
          PlayoffsStage.BEFOREPLAOFFS,
          user,
        );
        const beforePlayoffsGuessesNew = this.extractCertainProperties(
          beforePlayoffsStageGuesses.conferenceFinalGuesses,
          beforePlayoffsStageGuesses.championTeamGuesses,
          beforePlayoffsStageGuesses.mvpGuesses,
        );
        const round1StageGuesses = await this.getUserGuesses(
          PlayoffsStage.ROUND1,
          user,
        );
        const round1GuessesNew = this.extractCertainProperties(
          round1StageGuesses.conferenceFinalGuesses,
          round1StageGuesses.championTeamGuesses,
          round1StageGuesses.mvpGuesses,
        );

        if (stage === PlayoffsStage.FINISH) {
          const round2Guesses = await this.getUserGuesses(
            PlayoffsStage.ROUND2,
            user,
          );
          const round2StageGuesses = this.extractCertainProperties(
            round2Guesses.conferenceFinalGuesses,
            round2Guesses.championTeamGuesses,
            round2Guesses.mvpGuesses,
          );
          return {
            beforePlayoffs: beforePlayoffsGuessesNew,
            round1: round1GuessesNew,
            round2: round2StageGuesses,
          };
        }

        return {
          beforePlayoffs: beforePlayoffsGuessesNew,
          round1: round1GuessesNew,
        };
      }
    } catch (error) {
      this.logger.error(
        `User: ${user.username} failed to get his prior guesses. ${error.stack}`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} failed to get his prior guesses.`,
      );
    }
  }
  async getPassedStages(): Promise<string[]> {
    try {
      return await this.playoffsStageRepo.getPassedStages();
    } catch (error) {
      this.logger.error(`Failed to get passed stages. ${error.stack}`);
      throw new InternalServerErrorException(`Failed to get passed stages.`);
    }
  }
}
