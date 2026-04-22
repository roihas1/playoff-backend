export type GuessPageStatEntry = {
  label: string;
  votes: number;
  percentage: number;
};

export type GuessPageTop5Bucket = {
  top5: GuessPageStatEntry[];
  totalVotes: number;
};

export type GuessPageSeriesBetSidePercentages = { 1: number; 2: number };
export type GuessPageSeriesBetSideCounts = {
  1: number;
  2: number;
  total: number;
};

export type GuessPageSeriesBestOf7Percentages = {
  4: number;
  5: number;
  6: number;
  7: number;
};

export type GuessPageSeriesBestOf7Counts = {
  4: number;
  5: number;
  6: number;
  7: number;
  total: number;
};

export type GuessPageSeriesItem = {
  seriesId: string;
  seriesLabel: string;
  round: string;
  conference: string;
  team1: string;
  team2: string;
  percentages: {
    teamWin: GuessPageSeriesBetSidePercentages;
    bestOf7: GuessPageSeriesBestOf7Percentages;
    playerMatchup: Record<string, GuessPageSeriesBetSidePercentages>;
    spontaneousMatchups: Record<string, GuessPageSeriesBetSidePercentages>;
  };
  counts: {
    teamWin: GuessPageSeriesBetSideCounts;
    bestOf7: GuessPageSeriesBestOf7Counts;
    playerMatchup: Record<string, GuessPageSeriesBetSideCounts>;
    spontaneousMatchups: Record<string, GuessPageSeriesBetSideCounts>;
  };
  betsMeta: {
    playerMatchup: {
      betId: string;
      player1: string;
      player2: string;
      categories: string[];
    }[];
    spontaneous: {
      betId: string;
      gameNumber: number;
      player1: string;
      player2: string;
      categories: string[];
    }[];
  };
};

export type GuessPageChampionByStageItem = {
  stage: string;
  championTeam: GuessPageTop5Bucket;
  mvp: GuessPageTop5Bucket;
  conferenceFinals: GuessPageTop5Bucket;
};

export type GetGuessPageStatsDto = {
  meta: {
    tournamentId: string;
    leagueId: string | null;
    stageFilter: string;
    generatedAt: string;
  };
  series: GuessPageSeriesItem[];
  championByStage: GuessPageChampionByStageItem[];
};
