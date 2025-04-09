import { Module } from '@nestjs/common';
import { ComparisonPageService } from './comparison-page.service';
import { ComparisonPageController } from './comparison-page.controller';
import { AuthModule } from 'src/auth/auth.module';
import { SeriesModule } from 'src/series/series.module';
import { PlayoffsStageModule } from 'src/playoffs-stage/playoffs-stage.module';
import { PrivateLeagueModule } from 'src/private-league/private-league.module';

@Module({
  imports: [AuthModule, SeriesModule, PlayoffsStageModule, PrivateLeagueModule],
  providers: [ComparisonPageService],
  controllers: [ComparisonPageController],
})
export class ComparisonPageModule {}
