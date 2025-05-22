import { Injectable, Logger } from '@nestjs/common';

import { Repository, DataSource } from 'typeorm';
import { SpontaneousBet } from './spontaneousBet.entity';
import { CreateSpontaneousBetDto } from './dto/create-spontaneous-bet.dto';

@Injectable()
export class SpontaneousBetRepo extends Repository<SpontaneousBet> {
  private logger = new Logger('spontaneousBetRepo', { timestamp: true });
  constructor(dataSource: DataSource) {
    super(SpontaneousBet, dataSource.createEntityManager());
  }

  async createSpontaneousBet(
    createSpontaneousBetDto: CreateSpontaneousBetDto,
  ): Promise<SpontaneousBet> {
    const bet = this.create(createSpontaneousBetDto);
    const savedBet = await this.save(bet);
    return savedBet;
  }
  async getAllSeriesSpontaneousBets(
    seriesId: string,
  ): Promise<SpontaneousBet[]> {
    const query = this.createQueryBuilder('spontaneousBet');
    query.leftJoin('spontaneousBet.seriesId', 'series');
    query.select('spontaneousBet.id');
    query.where('spontaneousBet.seriesId.id = :seriesId', { seriesId });
    const bets = await query.getMany();
    return bets;
  }
}
