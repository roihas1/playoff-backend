import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeriesModule } from './series/series.module';

import { BestOf7BetModule } from './best-of7-bet/best-of7-bet.module';

import { TeamWinBetModule } from './team-win-bet/team-win-bet.module';

import { PlayerMatchupBetModule } from './player-matchup-bet/player-matchup-bet.module';

import { BestOf7GuessModule } from './best-of7-guess/best-of7-guess.module';

import { TeamWinGuessModule } from './team-win-guess/team-win-guess.module';

import { PlayerMatchupGuessModule } from './player-matchup-guess/player-matchup-guess.module';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { configValidationSchema } from './config.schema';
import { AssetsModule } from './assets/assets.module';
import { APP_FILTER } from '@nestjs/core';
import { UnauthorizedExceptionFilter } from './filters/unauthorizedException.Filter';
import { ChampionsGuessModule } from './champions-guess/champions-guess.module';
import { PlayoffsStageModule } from './playoffs-stage/playoffs-stage.module';

import { SpontaneousBetModule } from './spontaneous-bet/spontaneous-bet.module';

import { SpontaneousGuessModule } from './spontaneous-guess/spontaneous-guess.module';

import { PrivateLeagueModule } from './private-league/private-league.module';

import { AppDataSource } from './data-source';
import { AppLogger } from './logging/logger.service';
import { UserSeriesPointsModule } from './user-series-points/user-series-points.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.STAGE !== 'prod'
          ? [`.env.stage.${process.env.STAGE}`]
          : undefined,
      validationSchema: configValidationSchema,
    }),
    AuthModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        if (!AppDataSource.isInitialized) {
          await AppDataSource.initialize();
          console.log('AppDataSource has been initialized!');
        }
        return {
          ...AppDataSource.options,
        };
      },
    }),
    SeriesModule,
    BestOf7BetModule,
    TeamWinBetModule,
    PlayerMatchupBetModule,
    BestOf7GuessModule,
    TeamWinGuessModule,
    PlayerMatchupGuessModule,
    AssetsModule,
    ChampionsGuessModule,
    PlayoffsStageModule,
    SpontaneousBetModule,
    SpontaneousGuessModule,
    PrivateLeagueModule,
    UserSeriesPointsModule,
  ],
  controllers: [AppController],
  providers: [
    AppLogger,
    AppService,
    {
      provide: APP_FILTER,
      useClass: UnauthorizedExceptionFilter,
    },
  ],
  exports: [AppLogger],
})
export class AppModule {}
