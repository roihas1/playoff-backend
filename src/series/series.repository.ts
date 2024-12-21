import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Series } from './series.entity';
import { CreateSeriesDto } from './dto/create-series.dto';

@Injectable()
export class SeriesRepository extends Repository<Series> {
  private logger = new Logger('SeriesRepository', { timestamp: true });
  constructor(dataSource: DataSource) {
    super(Series, dataSource.createEntityManager());
  }

  // async getSeries(user:User): Promise<Series[]> {
  //     const query = this.createQueryBuilder('series');
  //     query.where
  // }

  async createSeries(createSeriesDto: CreateSeriesDto): Promise<Series> {
    const { team1, team2, round, dateOfStart } = createSeriesDto;
    const series = this.create({
      team1,
      team2,
      round,
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
