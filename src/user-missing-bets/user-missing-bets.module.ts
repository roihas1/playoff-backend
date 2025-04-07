import { Module } from '@nestjs/common';
import { UserMissingBetsService } from './user-missing-bets.service';
import { UserMissingBetsController } from './user-missing-bets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserMissingBetsRepository } from './user-missing-bets.repository';
import { SeriesModule } from 'src/series/series.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserMissingBetsRepository]),
    SeriesModule,
    AuthModule,
  ],
  providers: [UserMissingBetsService, UserMissingBetsRepository],
  controllers: [UserMissingBetsController],
})
export class UserMissingBetsModule {}
