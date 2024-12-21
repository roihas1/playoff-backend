import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SeriesService } from './series.service';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { Series } from './series.entity';
import { CreateSeriesDto } from './dto/create-series.dto';

@Controller('series')
@UseGuards(AuthGuard())
export class SeriesController {
  private logger = new Logger('SeriesController', { timestamp: true });
  constructor(private seriesServie: SeriesService) {}

  //   @Get()
  //   async getSeries(@GetUser() user: User): Promise<Series[]> {
  //     this.logger.verbose(`User "${user.username}" retrieving all his series.`);
  //     return await this.seriesServie.getSeries(user);
  //   }

  @Post()
  async createSeries(
    @Body() createSeriesDto: CreateSeriesDto,
    @GetUser() user: User,
  ): Promise<Series> {
    this.logger.verbose(
      `User "${user.username}" creating new series. Data: ${JSON.stringify(createSeriesDto)}.`,
    );
    return await this.seriesServie.createSeries(createSeriesDto); // todo: decide if I need to save the user to series.
  }

  @Get('/:id')
  async getSeriesByID(
    @Param('id') id: string,
    @GetUser() user: User,
  ): Promise<Series> {
    this.logger.verbose(
      `User "${user.username}" retrieving series with id: ${id}.`,
    );
    return await this.seriesServie.getSeriesByID(id);
  }
}
