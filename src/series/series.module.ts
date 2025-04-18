import { forwardRef, Module } from '@nestjs/common';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeriesRepository } from './series.repository';
import { AuthModule } from 'src/auth/auth.module';
import { TeamWinGuessModule } from 'src/team-win-guess/team-win-guess.module';
import { BestOf7GuessModule } from 'src/best-of7-guess/best-of7-guess.module';
import { PlayerMatchupGuessModule } from 'src/player-matchup-guess/player-matchup-guess.module';
import { TeamWinBetModule } from 'src/team-win-bet/team-win-bet.module';
import { BestOf7BetModule } from 'src/best-of7-bet/best-of7-bet.module';
import { PlayerMatchupBetModule } from 'src/player-matchup-bet/player-matchup-bet.module';
import { SpontaneousBetModule } from 'src/spontaneous-bet/spontaneous-bet.module';
import { SpontaneousGuessModule } from 'src/spontaneous-guess/spontaneous-guess.module';
import { UserSeriesPointsModule } from 'src/user-series-points/user-series-points.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SeriesRepository]),
    forwardRef(() => AuthModule),
    TeamWinGuessModule,
    BestOf7GuessModule,
    PlayerMatchupGuessModule,
    TeamWinBetModule,
    BestOf7BetModule,
    PlayerMatchupBetModule,
    SpontaneousBetModule,
    SpontaneousGuessModule,
    UserSeriesPointsModule,
  ],
  controllers: [SeriesController],
  providers: [SeriesService, SeriesRepository],
  exports: [SeriesService],
})
export class SeriesModule {}
