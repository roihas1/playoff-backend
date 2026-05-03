import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronService } from './cron.service';
import { NbaSyncCronService } from './nba-sync.cron.service';
import { CronController } from './cron.controller';
import { ProcessedNbaGame } from './processed-nba-game.entity';
import { ProcessedNbaGameRepository } from './processed-nba-game.repository';
import { SeriesModule } from '../series/series.module';
import { TeamModule } from '../team/team.module';
import { BalldontlieModule } from '../Integrations/Balldontlie/balldontlie.module';

@Module({
  imports: [
    HttpModule,
    SeriesModule,
    TeamModule,
    BalldontlieModule,
    TypeOrmModule.forFeature([ProcessedNbaGame]),
  ],
  controllers: [CronController],
  providers: [CronService, NbaSyncCronService, ProcessedNbaGameRepository],
})
export class CronModule {}
