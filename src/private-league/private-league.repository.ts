import { Injectable, Logger } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { PrivateLeague } from './private-league.entity';

@Injectable()
export class PrivateLeagueRepository extends Repository<PrivateLeague> {
  private logger = new Logger('PrivateLeagueRepository', {
    timestamp: true,
  });
  constructor(dataSource: DataSource) {
    super(PrivateLeague, dataSource.createEntityManager());
  }
}
