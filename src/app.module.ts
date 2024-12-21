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

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'rHas9697',
      database: 'playoffDB',
      entities: [User, Series, BestOf7Bet, TeamWinBet, PlayerMatchupBet],
      synchronize: true,
    }),
    SeriesModule,
    BestOf7BetModule,
    TeamWinBetModule,
    PlayerMatchupBetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
