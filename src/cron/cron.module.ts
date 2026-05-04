import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CronService } from './cron.service';
import { SeriesModule } from '../series/series.module';
import { PlayerMatchupBetModule } from 'src/player-matchup-bet/player-matchup-bet.module';
import { SpontaneousBetModule } from 'src/spontaneous-bet/spontaneous-bet.module';
import { UserSeriesPointsModule } from 'src/user-series-points/user-series-points.module';
import { SlateGradingModule } from 'src/Integrations/slate-grading/slate-grading.module';
import { PlayerMatchupBet } from 'src/player-matchup-bet/player-matchup-bet.entity';
import { SpontaneousBet } from 'src/spontaneous-bet/spontaneousBet.entity';
import { BetStatUpdate } from 'src/bet-stat-update/bet-stat-update.entity';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    SeriesModule,
    PlayerMatchupBetModule,
    SpontaneousBetModule,
    UserSeriesPointsModule,
    SlateGradingModule,
    TypeOrmModule.forFeature([PlayerMatchupBet, SpontaneousBet, BetStatUpdate]),
  ],
  providers: [CronService],
})
export class CronModule {}
