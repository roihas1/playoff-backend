import { Injectable, Logger } from '@nestjs/common';

import { PlayoffsStageRepository } from './playoffs-stage.repository';
import { PlayoffStage } from './playoffs-stage.entity';
import { User } from 'src/auth/user.entity';
import { CreatePlayoffsStageDto } from './dto/create-playoffs-stage.dto';
import { PlayoffsStage } from './playoffs-stage.enum';

@Injectable()
export class PlayoffsStageService {
  private logger = new Logger('PlayoffsStageService', { timestamp: true });
  constructor(private playoffsStageRepo: PlayoffsStageRepository) {}

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
    return found;
  }
  async getAllPlayoffsStages(user: User): Promise<PlayoffStage[]> {
    const found = await this.playoffsStageRepo.getAllPlayoffsStages();
    return found;
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
}
