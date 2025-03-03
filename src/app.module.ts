import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeriesModule } from './series/series.module';
import { User } from './auth/user.entity';
import { Series } from './series/series.entity';
import { BestOf7BetModule } from './best-of7-bet/best-of7-bet.module';
import { BestOf7Bet } from './best-of7-bet/bestOf7.entity';
import { TeamWinBetModule } from './team-win-bet/team-win-bet.module';
import { TeamWinBet } from './team-win-bet/team-win-bet.entity';
import { PlayerMatchupBetModule } from './player-matchup-bet/player-matchup-bet.module';
import { PlayerMatchupBet } from './player-matchup-bet/player-matchup-bet.entity';
import { BestOf7GuessModule } from './best-of7-guess/best-of7-guess.module';
import { BestOf7Guess } from './best-of7-guess/best-of7-guess.entity';
import { TeamWinGuessModule } from './team-win-guess/team-win-guess.module';
import { TeamWinGuess } from './team-win-guess/team-win-guess.entity';
import { PlayerMatchupGuessModule } from './player-matchup-guess/player-matchup-guess.module';
import { PlayerMatchupGuess } from './player-matchup-guess/player-matchup-guess.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configValidationSchema } from './config.schema';
import { AssetsModule } from './assets/assets.module';
import { APP_FILTER } from '@nestjs/core';
import { UnauthorizedExceptionFilter } from './filters/unauthorizedException.Filter';
import { ChampionsGuessModule } from './champions-guess/champions-guess.module';
import { PlayoffsStageModule } from './playoffs-stage/playoffs-stage.module';
import { MVPGuess } from './champions-guess/entities/mvp-guess.entity';
import { ConferenceFinalGuess } from './champions-guess/entities/conference-final-guess.entity';
import { ChampionTeamGuess } from './champions-guess/entities/champion-team-guess.entity';
import { PlayoffStage } from './playoffs-stage/playoffs-stage.entity';
import { SpontaneousBetModule } from './spontaneous-bet/spontaneous-bet.module';
import { SpontaneousBet } from './spontaneous-bet/spontaneousBet.entity';
import { SpontaneousGuessModule } from './spontaneous-guess/spontaneous-guess.module';
import { SpontaneousGuess } from './spontaneous-guess/spontaneous-guess.entity';
import { PrivateLeagueModule } from './private-league/private-league.module';
import { PrivateLeague } from './private-league/private-league.entity';
import { AppDataSource } from './data-source';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [`.env.stage.${process.env.STAGE}`],
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: UnauthorizedExceptionFilter,
    },
  ],
})
export class AppModule {}
