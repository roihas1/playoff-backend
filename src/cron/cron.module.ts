import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CronService } from './cron.service';
import { SeriesModule } from '../series/series.module';

@Module({
  imports: [HttpModule, SeriesModule],
  providers: [CronService],
})
export class CronModule {}
