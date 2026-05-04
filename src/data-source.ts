// src/data-source.ts
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './auth/user.entity';
import { Series } from './series/series.entity';
import { BestOf7Bet } from './best-of7-bet/bestOf7.entity';
import { TeamWinBet } from './team-win-bet/team-win-bet.entity';
import { PlayerMatchupBet } from './player-matchup-bet/player-matchup-bet.entity';
import { BestOf7Guess } from './best-of7-guess/best-of7-guess.entity';
import { TeamWinGuess } from './team-win-guess/team-win-guess.entity';
import { PlayerMatchupGuess } from './player-matchup-guess/player-matchup-guess.entity';
import { MVPGuess } from './champions-guess/entities/mvp-guess.entity';
import { ConferenceFinalGuess } from './champions-guess/entities/conference-final-guess.entity';
import { ChampionTeamGuess } from './champions-guess/entities/champion-team-guess.entity';
import { PlayoffStage } from './playoffs-stage/playoffs-stage.entity';
import { SpontaneousBet } from './spontaneous-bet/spontaneousBet.entity';
import { SpontaneousGuess } from './spontaneous-guess/spontaneous-guess.entity';
import { PrivateLeague } from './private-league/private-league.entity';
import { LeagueMessage } from './private-league/league-message.entity';
import { UserSeriesPoints } from './user-series-points/user-series-points.entity';
import { UserMissingBet } from './user-missing-bets/user-missing-bets.entity';
import { Tournament } from './tournament/tournament.entity';
import { Team } from './team/team.entity';
import { UserTournamentPoints } from './user-tournament-points/user-tournament-points.entity';
import { UserTournamentPointsAndPlayoffStageTournament1743787200000 } from './migrations/1743787200000-user-tournament-points-and-playoff-stage-tournament';
import { DropUserLegacyPointColumns1744000000000 } from './migrations/1744000000000-drop-user-legacy-point-columns';
import { UserSeriesPointsTournament1744100000000 } from './migrations/1744100000000-user-series-points-tournament';
import { PrivateLeagueTournament1744200000000 } from './migrations/1744200000000-private-league-tournament';
import { LeagueMessageCursorIndex1744300000000 } from './migrations/1744300000000-league-message-cursor-index';
import { BetStatUpdate } from './bet-stat-update/bet-stat-update.entity';
import { BetStatUpdateLedger1744400000000 } from './migrations/1744400000000-bet-stat-update';
import { SeriesGameUpdate } from './series/series-game-update.entity';
import { SeriesGameUpdate1744500000000 } from './migrations/1744500000000-series-game-update';

ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: [`.env.stage.${process.env.STAGE}`],
});

const configService = new ConfigService();
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  entities: [
    User,
    Series,
    BestOf7Bet,
    TeamWinBet,
    PlayerMatchupBet,
    BestOf7Guess,
    TeamWinGuess,
    PlayerMatchupGuess,
    MVPGuess,
    ConferenceFinalGuess,
    ChampionTeamGuess,
    PlayoffStage,
    SpontaneousBet,
    SpontaneousGuess,
    PrivateLeague,
    LeagueMessage,
    UserSeriesPoints,
    UserMissingBet,
    Tournament,
    Team,
    UserTournamentPoints,
    BetStatUpdate,
    SeriesGameUpdate,
  ],
  migrations: [
    UserTournamentPointsAndPlayoffStageTournament1743787200000,
    DropUserLegacyPointColumns1744000000000,
    UserSeriesPointsTournament1744100000000,
    PrivateLeagueTournament1744200000000,
    LeagueMessageCursorIndex1744300000000,
    BetStatUpdateLedger1744400000000,
    SeriesGameUpdate1744500000000,
  ],
  migrationsTableName: 'typeorm_migrations',
  synchronize: true,
  logging: false,
  ssl: true,
  extra: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
});
