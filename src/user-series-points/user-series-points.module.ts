import { forwardRef, Module } from '@nestjs/common';
import { UserSeriesPointsService } from './user-series-points.service';
import { UserSeriesPointsController } from './user-series-points.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSeriesPointsRepository } from './user-series-points.repository';
import { SeriesModule } from 'src/series/series.module';
import { AuthModule } from 'src/auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSeriesPointsRepository]),
    forwardRef(() => SeriesModule),
    forwardRef(() => AuthModule),
    ScheduleModule,
  ],
  providers: [UserSeriesPointsService, UserSeriesPointsRepository],
  controllers: [UserSeriesPointsController],
  exports: [UserSeriesPointsService],
})
export class UserSeriesPointsModule {}
