import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { PlayoffStage } from './playoffs-stage.entity';
import { LEGACY_MIGRATION_TOURNAMENT_ID } from 'src/tournament/legacy-migration-tournament.constants';

@Injectable()
export class PlayoffsStageRepository extends Repository<PlayoffStage> {
  private static readonly STAGE_ORDER = [
    'Before playoffs',
    'Round 1',
    'Round 2',
    'Finish',
  ];
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
    tournamentId: string,
  ): Promise<PlayoffStage> {
    const stage = this.create({
      name,
      startDate,
      timeOfStart,
      tournament: { id: tournamentId },
    });
    try {
      return await this.save(stage);
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
  async getPassedStages(
    tournamentId: string = LEGACY_MIGRATION_TOURNAMENT_ID,
  ): Promise<string[]> {
    const query = this.createQueryBuilder('playoff-stage');
    const date = new Date();
    const currentDate = date.toISOString().slice(0, 10);
    const currentTime = date.toTimeString().slice(0, 8);
    query.where(
      'playoff-stage.tournamentId = :tournamentId AND (playoff-stage.startDate < :currentDate OR (playoff-stage.startDate <= :currentDate AND playoff-stage.timeOfStart < :currentTime))',
      {
        tournamentId,
        currentDate,
        currentTime,
      },
    );
    const stages = await query.getMany();
    const uniqueStages = [...new Set(stages.map((stage) => stage.name))];

    return uniqueStages.sort((a, b) => {
      const firstIndex = PlayoffsStageRepository.STAGE_ORDER.indexOf(a);
      const secondIndex = PlayoffsStageRepository.STAGE_ORDER.indexOf(b);
      return firstIndex - secondIndex;
    });
  }
}
