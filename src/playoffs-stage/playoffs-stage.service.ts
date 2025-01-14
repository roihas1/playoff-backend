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

@Injectable()
export class PlayoffsStageService {
  private logger = new Logger('PlayoffsStageService', { timestamp: true });
  constructor(
    private playoffsStageRepo: PlayoffsStageRepository,
    @Inject(forwardRef(() => ChampionsGuessService))
    private championGuessService: ChampionsGuessService,
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
      );
    }
    if (createPlayoffsStageDto.startDate) {
      found.startDate = new Date(createPlayoffsStageDto.startDate);
      await this.playoffsStageRepo.save(found);
    }

    return found;
  }
  async getAllPlayoffsStages(): Promise<PlayoffStage[]> {
    const stagesName = ['Before playoffs', 'Round 1', 'Round 2'];
    const found = await this.playoffsStageRepo.getAllPlayoffsStages();
    const stages = found.sort((a, b) => {
      return stagesName.indexOf(a.name) - stagesName.indexOf(b.name);
    });

    return stages;
  }
  async checkGuess(stage: PlayoffsStage, user: User): Promise<boolean> {
    const foundStage = await this.playoffsStageRepo.findOne({
      where: {
        name: stage,
      },
      relations: [
        'conferenceFinalGuesses',
        'championTeamGuesses',
        'mvpGuesses',
        'mvpGuesses.createdBy',
        'championTeamGuesses.createdBy',
        'conferenceFinalGuesses.createdBy',
      ],
    });
    if (stage === 'Before playoffs') {
      if (
        foundStage.championTeamGuesses.some(
          (guess) => guess.createdBy.id === user.id,
        ) &&
        foundStage.conferenceFinalGuesses.some(
          (guess) => guess.createdBy.id === user.id,
        ) &&
        foundStage.mvpGuesses.some((guess) => guess.createdBy.id === user.id)
      ) {
        return true;
      }
    } else if (
      foundStage.mvpGuesses.some((guess) => guess.createdBy.id === user.id) &&
      foundStage.championTeamGuesses.some(
        (guess) => guess.createdBy.id === user.id,
      )
    ) {
      return true;
    }
    return false;
  }
  async closeGuesses(closeGuessesDto: CloseGuessesDto): Promise<void> {
    try {
      const stages = await this.getAllPlayoffsStages();
      const {
        easternConferenceFinal,
        westernConferenceFinal,
        finals,
        championTeam,
        mvp,
      } = closeGuessesDto;
      const easternConferenceFinalGuesses: ConferenceFinalGuess[] =
        stages[0].conferenceFinalGuesses.filter(
          (guess) => guess.conference === 'East',
        );
      const westernConferenceFinalGuesses: ConferenceFinalGuess[] =
        stages[0].conferenceFinalGuesses.filter(
          (guess) => guess.conference === 'West',
        );
      const finalsGuesses: ConferenceFinalGuess[] =
        stages[0].conferenceFinalGuesses.filter(
          (guess) => guess.conference === 'Finals',
        );

      stages.map(async (stage) => {
        if (stage.name === 'Before playoffs') {
          await this.championGuessService.updatePointsConferenceFinalsForUser(
            easternConferenceFinal,
            easternConferenceFinalGuesses,
          );
          await this.championGuessService.updatePointsConferenceFinalsForUser(
            westernConferenceFinal,
            westernConferenceFinalGuesses,
          );
          await this.championGuessService.updatePointsConferenceFinalsForUser(
            finals,
            finalsGuesses,
          );
        }
        await this.championGuessService.updatePointsForUserChampionTeam(
          championTeam,
          stage.championTeamGuesses,
        );
        await this.championGuessService.updatePointsForUserMVP(
          mvp,
          stage.mvpGuesses,
        );
      });
      // this.logger.verbose('Closing champions guesses succeed');
    } catch (error) {
      this.logger.error('Failed to close champions guesses');
      throw error;
    }
  }
  async getUserGuesses(
    stage: PlayoffsStage,
    user: User,
  ): Promise<{
    conferenceFinalGuesses: ConferenceFinalGuess[];
    championTeamGuesses: ChampionTeamGuess[];
    mvpGuesses: MVPGuess[];
  }> {
    try {
      const stageObj = await this.playoffsStageRepo.findOne({
        where: {
          name: stage,
        },
        relations: [
          'conferenceFinalGuesses',
          'championTeamGuesses',
          'mvpGuesses',
          'mvpGuesses.createdBy',
          'championTeamGuesses.createdBy',
          'conferenceFinalGuesses.createdBy',
        ],
      });
      let conferenceFinalGuesses = [];
      if (stage === 'Before playoffs') {
        conferenceFinalGuesses = stageObj.conferenceFinalGuesses.filter(
          (guess) => guess.createdBy.id === user.id,
        );
      }
      console.log(conferenceFinalGuesses);
      const championTeamGuesses = stageObj.championTeamGuesses.filter(
        (guess) => guess.createdBy.id === user.id,
      );
      const mvpGuesses = stageObj.mvpGuesses.filter(
        (guess) => guess.createdBy.id === user.id,
      );

      return { conferenceFinalGuesses, championTeamGuesses, mvpGuesses };
    } catch (error) {
      this.logger.error(
        `User: ${user.username} failed to get his guesses. ${error}`,
      );
      throw new InternalServerErrorException(
        `User: ${user.username} failed to get his guesses.`,
      );
    }
  }
}
