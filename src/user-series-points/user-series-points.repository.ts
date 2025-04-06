import { Injectable, Logger } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';

import { UserSeriesPoints } from './user-series-points.entity';

@Injectable()
export class UserSeriesPointsRepository extends Repository<UserSeriesPoints> {
  private logger = new Logger('UserSeriesPointsRepository', {
    timestamp: true,
  });
  constructor(dataSource: DataSource) {
    super(UserSeriesPoints, dataSource.createEntityManager());
  }
}
