import { Module } from '@nestjs/common';
import { HomePageService } from './home-page.service';
import { HomePageController } from './home-page.controller';
import { AuthModule } from 'src/auth/auth.module';
import { SeriesModule } from 'src/series/series.module';
import { UserSeriesPointsModule } from 'src/user-series-points/user-series-points.module';
import { PlayoffsStageModule } from 'src/playoffs-stage/playoffs-stage.module';

@Module({
  imports: [
    SeriesModule,
    AuthModule,
    UserSeriesPointsModule,
    PlayoffsStageModule,
  ],
  providers: [HomePageService],
  controllers: [HomePageController],
})
export class HomePageModule {}
