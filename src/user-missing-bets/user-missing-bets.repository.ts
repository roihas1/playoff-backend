import { Injectable, Logger } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { UserMissingBet } from './user-missing-bets.entity';

@Injectable()
export class UserMissingBetsRepository extends Repository<UserMissingBet> {
  private logger = new Logger('UserMissingBetsRepository', {
    timestamp: true,
  });
  constructor(dataSource: DataSource) {
    super(UserMissingBet, dataSource.createEntityManager());
  }
}
