import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { PlayoffStage } from './playoffs-stage.entity';

@Injectable()
export class PlayoffsStageRepository extends Repository<PlayoffStage> {
  private logger = new Logger('PlayoffsStageRepository', {
    timestamp: true,
  });
  constructor(dataSource: DataSource) {
    super(PlayoffStage, dataSource.createEntityManager());
  }

  async createPlayoffsStage(
    name: string,
    startDate: string,
    timeOfStart: string,
  ): Promise<PlayoffStage> {
    const stage = this.create({
      name,
      startDate,
      timeOfStart,
    });
    try {
      const savedStage = this.save(stage);
      return savedStage;
    } catch (error) {
      this.logger.error(
        `Failed to create stage ${name} that start at ${startDate}`,
      );
      throw new InternalServerErrorException(
        `Failed to create stage ${name} that start at ${startDate}`,
      );
    }
  }
  async getAllPlayoffsStages(): Promise<PlayoffStage[]> {
    try {
      const query = this.createQueryBuilder('playoff-stage')
        .leftJoinAndSelect(
          'playoff-stage.conferenceFinalGuesses',
          'conferenceFinalGuess',
        )
        .leftJoinAndSelect(
          'conferenceFinalGuess.createdBy', // Join createdBy on conferenceFinalGuess
          'user1',
        )
        .leftJoinAndSelect(
          'playoff-stage.championTeamGuesses',
          'championFinalGuess',
        )
        .leftJoinAndSelect(
          'championFinalGuess.createdBy', // Join createdBy on championFinalGuess
          'user2',
        )
        .leftJoinAndSelect('playoff-stage.mvpGuesses', 'mvpGuess')
        .leftJoinAndSelect(
          'mvpGuess.createdBy', // Join createdBy on mvpGuess
          'user3',
        );
      return await query.getMany();
    } catch (error) {
      this.logger.error(`Failed to get all stages`);
      throw new InternalServerErrorException(`Failed to get all stages`);
    }
  }
}
