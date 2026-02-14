// src/comparison/dto/get-comparison-data.dto.ts

import { User } from 'src/auth/user.entity';
import { PrivateLeague } from 'src/private-league/private-league.entity';
import { BestOf7Bet } from 'src/best-of7-bet/bestOf7.entity';
import { TeamWinBet } from 'src/team-win-bet/team-win-bet.entity';
import { PlayerMatchupBet } from 'src/player-matchup-bet/player-matchup-bet.entity';
import { SpontaneousBet } from 'src/spontaneous-bet/spontaneousBet.entity';
import { Conference } from 'src/series/conference.enum';
import { Round } from 'src/series/round.enum';

export type TournamentInfoDto = {
  id: string;
  sportType: string;
  year: number;
  name: string;
} | null;

export class GetComparisonDataDto {
  allBets: {
    [seriesId: string]: {
      team1Id: string;
      team2Id: string;
      team1Name: string;
      team2Name: string;
      conference: Conference;
      round: Round;
      startDate: Date;
      tournament: TournamentInfoDto;
      bestOf7Bet: BestOf7Bet;
      teamWinBet: TeamWinBet;
      playerMatchupBets: PlayerMatchupBet[];
      spontaneousBets: SpontaneousBet[];
    };
  };

  userLeagues: PrivateLeague[];

  allUsers: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    fantasyPoints: number;
    championPoints: number;
  }[];

  passedStages: string[];

  currentUser: User;
}
