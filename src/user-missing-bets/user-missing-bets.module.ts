import { forwardRef, Module } from '@nestjs/common';
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
    forwardRef(() => AuthModule),
  ],
  providers: [UserMissingBetsService, UserMissingBetsRepository],
  controllers: [UserMissingBetsController],
  exports: [UserMissingBetsService],
})
export class UserMissingBetsModule {}
