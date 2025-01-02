import { Module } from '@nestjs/common';
import { TeamWinGuessController } from './team-win-guess.controller';
import { TeamWinGuessService } from './team-win-guess.service';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from 'src/auth/auth.module';
import { TeamWinGuessRepository } from './team-win-guess.repository';
import { TeamWinBetModule } from 'src/team-win-bet/team-win-bet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamWinGuessRepository]),
    AuthModule,
    TeamWinBetModule,
  ],
  controllers: [TeamWinGuessController],
  providers: [TeamWinGuessService, TeamWinGuessRepository],
  exports: [TeamWinGuessService],
})
export class TeamWinGuessModule {}
