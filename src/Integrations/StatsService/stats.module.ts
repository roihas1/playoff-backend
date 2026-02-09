import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StatsService } from './stats.service';

@Module({
  imports: [HttpModule],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
