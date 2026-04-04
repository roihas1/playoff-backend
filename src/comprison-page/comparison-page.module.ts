import { Module } from '@nestjs/common';
import { ComparisonPageService } from './comparison-page.service';
import { ComparisonPageController } from './comparison-page.controller';
import { AuthModule } from 'src/auth/auth.module';
import { SeriesModule } from 'src/series/series.module';
import { PlayoffsStageModule } from 'src/playoffs-stage/playoffs-stage.module';
import { PrivateLeagueModule } from 'src/private-league/private-league.module';
import { UserTournamentPointsModule } from 'src/user-tournament-points/user-tournament-points.module';

@Module({
  imports: [
    AuthModule,
    SeriesModule,
    PlayoffsStageModule,
    PrivateLeagueModule,
    UserTournamentPointsModule,
  ],
  providers: [ComparisonPageService],
  controllers: [ComparisonPageController],
})
export class ComparisonPageModule {}
