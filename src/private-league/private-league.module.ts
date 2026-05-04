import { Module } from '@nestjs/common';
import { PrivateLeagueController } from './private-league.controller';
import { PrivateLeagueService } from './private-league.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrivateLeagueRepository } from './private-league.repository';
import { AuthModule } from 'src/auth/auth.module';
import { UserTournamentPointsModule } from 'src/user-tournament-points/user-tournament-points.module';
import { Tournament } from 'src/tournament/tournament.entity';
import { LeagueMessage } from './league-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PrivateLeagueRepository,
      Tournament,
      LeagueMessage,
    ]),
    AuthModule,
    UserTournamentPointsModule,
  ],
  controllers: [PrivateLeagueController],
  providers: [PrivateLeagueService, PrivateLeagueRepository],
  exports: [PrivateLeagueService],
})
export class PrivateLeagueModule {}
