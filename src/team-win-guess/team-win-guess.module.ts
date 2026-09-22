import { forwardRef, Module } from '@nestjs/common';
import { TeamWinGuessController } from './team-win-guess.controller';
import { TeamWinGuessService } from './team-win-guess.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from 'src/auth/auth.module';
import { TeamWinGuessRepository } from './team-win-guess.repository';
import { TeamWinBetModule } from 'src/team-win-bet/team-win-bet.module';
import { UserMissingBetsModule } from 'src/user-missing-bets/user-missing-bets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamWinGuessRepository]),
    forwardRef(() => AuthModule),
    forwardRef(() => TeamWinBetModule),
    forwardRef(() => UserMissingBetsModule),
  ],
  controllers: [TeamWinGuessController],
  providers: [TeamWinGuessService, TeamWinGuessRepository],
  exports: [TeamWinGuessService],
})
export class TeamWinGuessModule {}
