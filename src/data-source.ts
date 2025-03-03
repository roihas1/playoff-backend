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
  ],
  synchronize: true,
  logging: false,
});
