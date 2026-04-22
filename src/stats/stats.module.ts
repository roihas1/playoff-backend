import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { BestOf7Guess } from 'src/best-of7-guess/best-of7-guess.entity';
import { ChampionTeamGuess } from 'src/champions-guess/entities/champion-team-guess.entity';
import { ConferenceFinalGuess } from 'src/champions-guess/entities/conference-final-guess.entity';
import { MVPGuess } from 'src/champions-guess/entities/mvp-guess.entity';
import { PlayerMatchupGuess } from 'src/player-matchup-guess/player-matchup-guess.entity';
import { PlayoffStage } from 'src/playoffs-stage/playoffs-stage.entity';
import { PrivateLeague } from 'src/private-league/private-league.entity';
import { SeriesModule } from 'src/series/series.module';
import { Series } from 'src/series/series.entity';
import { SpontaneousGuess } from 'src/spontaneous-guess/spontaneous-guess.entity';
import { TeamWinGuess } from 'src/team-win-guess/team-win-guess.entity';
import { Tournament } from 'src/tournament/tournament.entity';
import { TournamentModule } from 'src/tournament/tournament.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tournament,
      PrivateLeague,
      Series,
      TeamWinGuess,
      BestOf7Guess,
      PlayerMatchupGuess,
      SpontaneousGuess,
      PlayoffStage,
      ChampionTeamGuess,
      MVPGuess,
      ConferenceFinalGuess,
    ]),
    AuthModule,
    TournamentModule,
    SeriesModule,
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
