import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Series } from './series.entity';
import { CreateSeriesDto } from './dto/create-series.dto';
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
    const { round, coast, team } = filters;
    const query = this.createQueryBuilder('series')
      .leftJoinAndSelect('series.playerMatchupBets', 'playerMatchupBet')
      .leftJoinAndSelect('series.bestOf7BetId', 'bestOf7Bet');
    if (round) {
      query.andWhere('series.round = :round', { round });
    }

    if (coast) {
      query.andWhere('series.coast = :coast', { coast });
    }

    if (team) {
      query.andWhere(
        'LOWER(series.team1) = LOWER(:team) or LOWER(series.team2) = LOWER(:team)',
        { team },
      );
    }
    const series = await query.getMany();
    return series;
  }
  async getAllSeries(): Promise<Series[]> {
    const series = await this.find();
    return series;
  }

  async createSeries(createSeriesDto: CreateSeriesDto): Promise<Series> {
    const {
      team1,
      team2,
      seed1,
      seed2,
      round,
      conference: coast,
      dateOfStart,
    } = createSeriesDto;
    const series = this.create({
      team1,
      team2,
      seed1,
      seed2,
      round,
      conference: coast,
      dateOfStart,
    });

    try {
      const savedSeries = await this.save(series);
      this.logger.verbose(
        `Series of "${savedSeries.team1}" versus "${savedSeries.team2}" created successfully.`,
      );
      return savedSeries;
    } catch (error) {
      this.logger.error(
        `Failed to create series of "${series.team1}" versus "${series.team2}".`,
        error.stack,
      );
      throw new InternalServerErrorException();
    }
  }
}
