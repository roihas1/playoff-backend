import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Series } from './series.entity';
import { CreateSeriesData } from './dto/create-series-data';
import { GetSeriesWithFilterDto } from './dto/get-series-filter.dto';

@Injectable()
export class SeriesRepository extends Repository<Series> {
  private logger = new Logger('SeriesRepository', { timestamp: true });
  constructor(dataSource: DataSource) {
    super(Series, dataSource.createEntityManager());
  }
  async getSeriesWithFilters(
    filters: GetSeriesWithFilterDto,
  ): Promise<Series[]> {
    const { round, coast, teamId, tournamentId } = filters;
    const query = this.createQueryBuilder('series')
      .leftJoinAndSelect('series.tournament', 'tournament')
      .leftJoinAndSelect('series.team1Relation', 'team1Relation')
      .leftJoinAndSelect('series.team2Relation', 'team2Relation')
      .leftJoinAndSelect('series.playerMatchupBets', 'playerMatchupBet')
      .leftJoinAndSelect('series.bestOf7BetId', 'bestOf7Bet')
      .leftJoinAndSelect('series.spontaneousBets', 'spontaneousBet');
    if (round) {
      query.andWhere('series.round = :round', { round });
    }

    if (coast) {
      query.andWhere('series.coast = :coast', { coast });
    }

    if (teamId) {
      query.andWhere('series.team1Id = :teamId OR series.team2Id = :teamId', {
        teamId,
      });
    }

    if (tournamentId) {
      query.andWhere('series.tournamentId = :tournamentId', { tournamentId });
    }

    const series = await query.getMany();
    return series;
  }
  async getAllSeries(): Promise<Series[]> {
    const series = await this.find();
    return series;
  }

  async findInProgressSeriesByTeamId(
    winnerTeamId: string,
  ): Promise<Series | null> {
    const list = await this.createQueryBuilder('series')
      .leftJoinAndSelect('series.bestOf7BetId', 'bestOf7Bet')
      .leftJoinAndSelect('series.team1Relation', 'team1')
      .leftJoinAndSelect('series.team2Relation', 'team2')
      .where(
        'series.team1Id = :winnerTeamId OR series.team2Id = :winnerTeamId',
        {
          winnerTeamId,
        },
      )
      .orderBy('series.dateOfStart', 'DESC')
      .getMany();

    for (const series of list) {
      const score = series.bestOf7BetId?.seriesScore;
      if (score && Array.isArray(score) && score.length >= 2) {
        const maxWins = Math.max(score[0], score[1]);
        if (maxWins < 4) return series;
      } else {
        return series;
      }
    }
    return null;
  }

  async createSeries(data: CreateSeriesData): Promise<Series> {
    const {
      team1Id,
      team2Id,
      seed1,
      seed2,
      round,
      conference: coast,
      dateOfStart,
      timeOfStart,
      tournamentId,
    } = data;

    const series = this.create({
      team1Relation: { id: team1Id } as any,
      team2Relation: { id: team2Id } as any,
      seed1,
      seed2,
      round,
      conference: coast,
      dateOfStart,
      timeOfStart,
      ...(tournamentId && { tournament: { id: tournamentId } as any }),
    });

    try {
      const savedSeries = await this.save(series);
      this.logger.verbose(
        `Series created successfully (team1Id: ${savedSeries.team1Relation?.id ?? team1Id}, team2Id: ${savedSeries.team2Relation?.id ?? team2Id}).`,
      );
      return savedSeries;
    } catch (error) {
      this.logger.error(
        `Failed to create series (team1Id: ${team1Id}, team2Id: ${team2Id}).`,
        error.stack,
      );
      throw new InternalServerErrorException();
    }
  }
}
