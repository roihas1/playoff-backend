// src/comparison/dto/get-comparison-data.dto.ts

import { User } from 'src/auth/user.entity';
import { PrivateLeague } from 'src/private-league/private-league.entity';
import { BestOf7Bet } from 'src/best-of7-bet/bestOf7.entity';
import { TeamWinBet } from 'src/team-win-bet/team-win-bet.entity';
import { PlayerMatchupBet } from 'src/player-matchup-bet/player-matchup-bet.entity';
import { SpontaneousBet } from 'src/spontaneous-bet/spontaneousBet.entity';
import { Conference } from 'src/series/conference.enum';
import { Round } from 'src/series/round.enum';

export class GetComparisonDataDto {
  allBets: {
    [seriesId: string]: {
      team1: string;
      team2: string;
      conference: Conference;
      round: Round;
      startDate: Date;
      bestOf7Bet: BestOf7Bet;
      teamWinBet: TeamWinBet;
      playerMatchupBets: PlayerMatchupBet[];
      spontaneousBets: SpontaneousBet[];
    };
  };

  userLeagues: PrivateLeague[];

  allUsers: User[];

  passedStages: string[];

  currentUser: User;
}
