// src/comparison/dto/get-comparison-data.dto.ts

import { Round } from 'src/series/round.enum';

export class GetComparisonDataDto {
  /** Tournament used for `seriesCatalog`/`userLeagues` scoping and `currentUser` totals. */
  tournamentId: string;

  currentUser: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    fantasyPoints: number;
    championPoints: number;
  };

  userLeagues: { id: string; name: string }[];

  passedStages: string[];

  /** Lightweight, already-started series only — used to populate the series dropdown. */
  seriesCatalog: {
    id: string;
    team1: string;
    team2: string;
    round: Round;
    startDate: Date;
    timeOfStart: string;
  }[];
}
