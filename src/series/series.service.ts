import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SeriesRepository } from './series.repository';
import { Series } from './series.entity';
// import { User } from '../auth/user.entity';
import { CreateSeriesDto } from './dto/create-series.dto';

@Injectable()
export class SeriesService {
  private logger = new Logger('SeriesService', { timestamp: true });
  constructor(private seriesRepository: SeriesRepository) {}

  //   getSeries(user: User): Promise<Series[]> {
  //     return this.seriesRepository.getSeries(user);
  //   }

  async createSeries(createSeriesDto: CreateSeriesDto): Promise<Series> {
    return await this.seriesRepository.createSeries(createSeriesDto);
  }
  async getSeriesByID(id: string): Promise<Series> {
    const foundSeries = await this.seriesRepository.findOne({ where: { id } });
    if (!foundSeries) {
      this.logger.error(`Series with ID "${id}" not found .`);
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }
    return foundSeries;
  }
}
