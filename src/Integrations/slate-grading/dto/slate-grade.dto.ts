/**
 * Request: POST /api/slate/grade
 */
export interface SlateGradePlayerBet {
  playerName: string;
  betId: string;
  categories: Array<{ name: string }>;
}

export interface SlateGradeRequestDto {
  gameDate: string;
  playerBets: SlateGradePlayerBet[];
}

export interface SlateGameTeam {
  teamId: string;
  teamName: string;
  score: number;
}

export interface SlateGameRow {
  gameId: string;
  boxScoreError: string | null;
  home: SlateGameTeam;
  away: SlateGameTeam;
  winnerTeamId: string;
}

export interface SlatePlayerResultRow {
  playerName: string;
  betId?: string;
  playerId?: string;
  points: number | null;
  categoryResults?: Record<
    string,
    {
      value: number | null;
      line: number | null;
    }
  > | null;
  gameId: string | null;
  resolveStatus: string;
  error: string | null;
}

/**
 * 200 success envelope from StatsService
 */
export interface SlateGradeResponseDto {
  status: string;
  gameDate: string;
  gameCount: number;
  games: SlateGameRow[];
  playerResultCount: number;
  playerResults: SlatePlayerResultRow[];
}
