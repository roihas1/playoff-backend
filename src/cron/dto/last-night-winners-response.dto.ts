export interface LastNightWinnersGame {
  gameId: string;
  winnerTeamId: string;
}

export interface LastNightWinnersResponse {
  date: string;
  games: LastNightWinnersGame[];
  count: number;
}
